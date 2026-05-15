import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../../core/stores/uiStore';
import { useSceneStore } from '../../core/stores/sceneStore';
import { useArtStore } from '../../core/stores/artStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Circle, Triangle, Layers,
  Camera, Lock, Unlock, Play, Square,
  Activity, Database, Plus, Eye, EyeOff, Trash2,
  PenTool, Eraser, Move, ChevronUp, ChevronDown, Monitor, Download, Copy, Folder,
  Film, Settings, SkipBack, SkipForward, Clock,
  Pipette, PaintBucket, Undo2, Redo2, ZoomIn, ZoomOut,
  FlipHorizontal, Grid, Sun, Moon,
  BoxSelect
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import Editor from '@monaco-editor/react';

const GlassPanel = ({ children, className = '', style = {} }) => (
  <div className={`glass-panel ${className}`} style={style}>
    {children}
  </div>
);

const IconButton = ({ icon: Icon, label, onClick, active, variant = 'default', style = {} }) => {
  const colors = {
    default: active ? 'var(--accent-primary)' : 'var(--icon-color)',
    danger: active ? 'var(--accent-danger)' : 'var(--icon-color)',
    success: active ? 'var(--accent-success)' : 'var(--icon-color)',
  };
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        background: active ? 'var(--accent-glow)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'var(--accent-primary)' : 'transparent',
        borderRadius: '6px',
        padding: '0.4rem',
        cursor: 'pointer',
        color: colors[variant],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        ...style
      }}
    >
      <Icon size={18} />
    </button>
  );
};

const ArtistPanelUI = () => {
  const {
    addEntity, director, toggleCameraLock, saveCameraBookmark, restoreCameraBookmark, removeCameraBookmark,
    transformMode, setTransformMode, selectedEntityId, removeEntity
  } = useSceneStore(useShallow(state => ({
    addEntity: state.addEntity,
    director: state.director,
    toggleCameraLock: state.toggleCameraLock,
    saveCameraBookmark: state.saveCameraBookmark,
    restoreCameraBookmark: state.restoreCameraBookmark,
    removeCameraBookmark: state.removeCameraBookmark,
    transformMode: state.transformMode,
    setTransformMode: state.setTransformMode,
    selectedEntityId: state.selectedEntityId,
    removeEntity: state.removeEntity
  })));

  const {
    artLayers, activeLayerId, setActiveLayer, addArtLayer, removeArtLayer, updateArtLayer,
    reorderArtLayer, duplicateArtLayer, timeline, setTimeline, undoArtLayer, pushUndoState, redoArtLayer
  } = useArtStore(useShallow(state => ({
    artLayers: state.artLayers,
    activeLayerId: state.activeLayerId,
    setActiveLayer: state.setActiveLayer,
    addArtLayer: state.addArtLayer,
    removeArtLayer: state.removeArtLayer,
    updateArtLayer: state.updateArtLayer,
    reorderArtLayer: state.reorderArtLayer,
    duplicateArtLayer: state.duplicateArtLayer,
    timeline: state.timeline,
    setTimeline: state.setTimeline,
    undoArtLayer: state.undoArtLayer,
    pushUndoState: state.pushUndoState,
    redoArtLayer: state.redoArtLayer
  })));

  const { studioTools, setStudioTool, studioView, setStudioView } = useUIStore(useShallow(state => ({
    studioTools: state.studioTools,
    setStudioTool: state.setStudioTool,
    studioView: state.studioView,
    setStudioView: state.setStudioView
  })));

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const swatchRef = React.useRef(null);
  const activeLayer = artLayers.find(l => l.id === activeLayerId);

  const handleSwatchClick = () => {
    if (!showColorPicker && swatchRef.current) {
      const rect = swatchRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.top, left: rect.right + 12 });
    }
    setShowColorPicker(!showColorPicker);
  };

  const handleZoom = (direction) => {
    const newZoom = direction === 'in' ? Math.min(10, studioView.zoom * 1.5) : Math.max(0.1, studioView.zoom / 1.5);
    setStudioView({ zoom: newZoom });
  };

  const handleClearLayer = () => {
    if (selectedEntityId && director.isCameraLocked) {
      useSceneStore.getState().updateEntityData(selectedEntityId, { texture: null });
    } else if (activeLayerId) {
      pushUndoState();
      useArtStore.getState().updateArtLayerFrame(activeLayerId, timeline.currentFrame, null);
    }
  };

  return (
    <>
      <div className="ide-sidebar-left">
        <IconButton icon={Move} label="Pan (Space+Drag)" active={studioTools.active === 'pan'} onClick={() => setStudioTool({ active: 'pan' })} />
        <IconButton icon={PenTool} label="Brush (B)" active={studioTools.active === 'pencil'} onClick={() => setStudioTool({ active: 'pencil' })} />
        <IconButton icon={Eraser} label="Eraser (E)" active={studioTools.active === 'eraser'} onClick={() => setStudioTool({ active: 'eraser' })} />
        <IconButton icon={BoxSelect} label="Selection (M)" active={studioTools.active === 'selection'} onClick={() => setStudioTool({ active: 'selection' })} />
        <IconButton icon={PaintBucket} label="Fill Layer" active={studioTools.active === 'bucket'} onClick={() => setStudioTool({ active: 'bucket' })} />
        <IconButton icon={Pipette} label="Eyedropper (I)" active={studioTools.active === 'pipette'} onClick={() => setStudioTool({ active: 'pipette' })} />

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.2rem 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <IconButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={undoArtLayer} />
          <IconButton icon={Redo2} label="Redo (Ctrl+Y)" onClick={redoArtLayer} />
          <IconButton icon={Trash2} label="Clear Layer" onClick={handleClearLayer} variant="danger" />
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.2rem 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <IconButton icon={ZoomIn} label="Zoom In" onClick={() => handleZoom('in')} />
          <IconButton icon={ZoomOut} label="Zoom Out" onClick={() => handleZoom('out')} />
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.2rem 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <IconButton icon={FlipHorizontal} label="Symmetry X Axis" active={studioTools.symmetryX} onClick={() => setStudioTool({ symmetryX: !studioTools.symmetryX })} />
          <IconButton icon={Grid} label="2D Alignment Grid & Anchor" active={studioTools.showGrid2D} onClick={() => setStudioTool({ showGrid2D: !studioTools.showGrid2D })} />
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.2rem 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            ref={swatchRef}
            onClick={handleSwatchClick}
            style={{ width: '32px', height: '32px', backgroundColor: studioTools.color, border: '2px solid var(--border-glass)', cursor: 'pointer', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}
            title="Color Picker"
          />

          {showColorPicker && createPortal(
            <>
              <div
                onClick={() => setShowColorPicker(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
              />
              <div style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}>
                <GlassPanel style={{ padding: '0.5rem' }}>
                  <HexColorPicker color={studioTools.color} onChange={color => setStudioTool({ color })} />
                </GlassPanel>
              </div>
            </>,
            document.body
          )}

          <div className="tool-section" style={{ border: 'none', alignItems: 'center', padding: 0 }}>
            <span className="tool-label">SIZE</span>
            <input type="range" min="1" max="150" value={studioTools.size} onChange={e => setStudioTool({ size: Number(e.target.value) })} style={{ width: '36px' }} title={`Size: ${studioTools.size}px`} />
          </div>

          <div className="tool-section" style={{ border: 'none', alignItems: 'center', padding: 0, marginTop: '0.2rem' }}>
            <span className="tool-label">OPACITY</span>
            <input type="range" min="0.01" max="1" step="0.01" value={studioTools.opacity} onChange={e => setStudioTool({ opacity: Number(e.target.value) })} style={{ width: '36px' }} title={`Opacity: ${Math.round(studioTools.opacity * 100)}%`} />
          </div>
        </div>
      </div>

      <div className="ide-sidebar-right">
        <GlassPanel style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '0', border: 'none', background: 'transparent' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <Layers size={18} color="var(--accent-primary)" /> Art Layers
            </span>
            <button onClick={addArtLayer} style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--btn-primary-shadow)', transition: 'all 0.2s' }}><Plus size={14} /> New</button>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, overflowY: 'auto', paddingRight: '0.2rem' }}>
            {artLayers.map(layer => (
              <li
                key={layer.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem', marginBottom: '0.4rem', borderRadius: '6px',
                  background: activeLayerId === layer.id ? 'var(--layer-selected-bg)' : 'var(--bg-hover)',
                  cursor: 'pointer', border: activeLayerId === layer.id ? '1px solid var(--layer-selected-border)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  boxShadow: activeLayerId === layer.id ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'none'
                }}
                onClick={() => setActiveLayer(layer.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={(e) => { e.stopPropagation(); updateArtLayer(layer.id, { visible: !layer.visible }) }} style={{ background: 'none', border: 'none', color: layer.visible ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <span style={{ fontSize: '0.85rem', color: activeLayerId === layer.id ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeLayerId === layer.id ? 600 : 500 }}>{layer.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button onClick={(e) => { e.stopPropagation(); reorderArtLayer(layer.id, 'up'); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}><ChevronUp size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); reorderArtLayer(layer.id, 'down'); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}><ChevronDown size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateArtLayer(layer.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '0.1rem', marginLeft: '0.2rem' }}><Copy size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); removeArtLayer(layer.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '0.1rem', marginLeft: '0.2rem' }}><Trash2 size={14} /></button>
                </div>
              </li>
            ))}
          </ul>

          {activeLayer && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tool-label" style={{ margin: 0 }}>Layer Opacity</span>
                <input type="range" min="0" max="1" step="0.01" value={activeLayer.opacity} onChange={(e) => updateArtLayer(activeLayer.id, { opacity: Number(e.target.value) })} style={{ width: '120px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tool-label" style={{ margin: 0 }}>Blend Mode</span>
                <select value={activeLayer.blendMode} onChange={(e) => updateArtLayer(activeLayer.id, { blendMode: e.target.value })} style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                  <option value="normal">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Overlay</option>
                  <option value="color-dodge">Color Dodge</option>
                </select>
              </div>
            </div>
          )}
        </GlassPanel>

        <GlassPanel style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>3D Reference</h3>
            <IconButton icon={studioView.showGreybox ? Eye : EyeOff} active={studioView.showGreybox} onClick={() => setStudioView({ showGreybox: !studioView.showGreybox })} />
          </div>

          <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.75rem', background: 'var(--bg-deep)', padding: '0.3rem', borderRadius: '6px', width: '100%', border: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setTransformMode('translate')} style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, background: transformMode === 'translate' ? 'var(--bg-active)' : 'transparent', color: transformMode === 'translate' ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}>Move</button>
            <button onClick={() => setTransformMode('rotate')} style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, background: transformMode === 'rotate' ? 'var(--bg-active)' : 'transparent', color: transformMode === 'rotate' ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}>Rot</button>
            <button onClick={() => setTransformMode('scale')} style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, background: transformMode === 'scale' ? 'var(--bg-active)' : 'transparent', color: transformMode === 'scale' ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}>Scale</button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <select id="primitive-select" style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', outline: 'none', fontWeight: 500 }}>
              <option value="cube">Cube</option>
              <option value="sphere">Sphere</option>
              <option value="pyramid">Pyramid</option>
              <option value="plane">Plane</option>
              <option value="cylinder">Cylinder</option>
              <option value="torus">Torus</option>
              <option value="capsule">Capsule</option>
              <option value="tetrahedron">Tetrahedron</option>
              <option value="icosahedron">Icosahedron</option>
              <option value="dodecahedron">Dodecahedron</option>
              <option value="octahedron">Octahedron</option>
            </select>
            <button onClick={() => { const val = document.getElementById('primitive-select').value; addEntity(val); }} style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: '6px', padding: '0 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--btn-primary-shadow)' }}>
              Add
            </button>
            {selectedEntityId && (
              <button onClick={() => removeEntity(selectedEntityId)} style={{ background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete Selected Reference">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: director.isCameraLocked ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: 700 }}>
                <Camera size={16} /> {director.isCameraLocked ? "CAMERA LOCKED" : "FREE ORBIT"}
              </span>
              <IconButton
                icon={director.isCameraLocked ? Lock : Unlock}
                active={director.isCameraLocked}
                variant={director.isCameraLocked ? 'danger' : 'success'}
                onClick={toggleCameraLock}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.75rem 0', lineHeight: 1.5 }}>
              {director.isCameraLocked ? "Perspective locked for exact drawing alignment." : "Camera unlocked. Orbit to view scene."}
            </p>

            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="tool-label" style={{ margin: 0 }}>SAVED ANGLES</span>
                <button
                  onClick={() => { const name = prompt('Name for camera angle:'); if (name) saveCameraBookmark(name); }}
                  style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '4px', fontSize: '0.65rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                >
                  + Save Angle
                </button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(director.cameraBookmarks || []).map(mark => (
                  <li key={mark.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                    <button
                      onClick={() => restoreCameraBookmark(mark.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer', flex: 1, textAlign: 'left' }}
                    >
                      {mark.name}
                    </button>
                    <button onClick={() => removeCameraBookmark(mark.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassPanel>
      </div>
    </>
  );
};

const DevPanelUI = () => {
  const {
    entities, selectedEntityId, setSelectedEntity, updateEntityLogic,
    updateEntityData, removeEntity, duplicateEntity, sceneLogic,
    updateSceneLogic, scenes, activeSceneId
  } = useSceneStore(useShallow(state => ({
    entities: state.entities,
    selectedEntityId: state.selectedEntityId,
    setSelectedEntity: state.setSelectedEntity,
    updateEntityLogic: state.updateEntityLogic,
    updateEntityData: state.updateEntityData,
    removeEntity: state.removeEntity,
    duplicateEntity: state.duplicateEntity,
    sceneLogic: state.sceneLogic,
    updateSceneLogic: state.updateSceneLogic,
    scenes: state.scenes,
    activeSceneId: state.activeSceneId
  })));

  const selectedEntity = entities.find(e => e.id === selectedEntityId);
  const currentScene = scenes.find(s => s.id === activeSceneId);

  return (
    <>
      <div className="ide-sidebar-left dev-mode">
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-main)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Database size={18} color="var(--accent-primary)" /> Hierarchy</span>
          <button
            onClick={() => {
              if (window.confirm('FACTORY RESET: Wipe all entities from this scene to fix corrupted cache?')) {
                useSceneStore.setState({ entities: [], selectedEntityId: null });
              }
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}
            title="Nuke All Volumes (Fix Cache)"
          >
            <Trash2 size={16} />
          </button>
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, overflowY: 'auto' }}>
          {entities.map(e => (
            <li
              key={e.id}
              onClick={() => setSelectedEntity(e.id)}
              style={{
                padding: '0.6rem 0.75rem', marginBottom: '0.4rem', borderRadius: '6px', cursor: 'pointer',
                background: selectedEntityId === e.id ? 'var(--layer-selected-bg)' : 'var(--bg-hover)',
                border: selectedEntityId === e.id ? '1px solid var(--layer-selected-border)' : '1px solid transparent',
                color: selectedEntityId === e.id ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.2s', fontWeight: selectedEntityId === e.id ? 600 : 500
              }}
            >
              {e.name}
              <span style={{ fontSize: '0.65rem', background: selectedEntityId === e.id ? 'var(--entity-badge-bg)' : 'var(--bg-deep)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: selectedEntityId === e.id ? 'var(--entity-badge-color)' : 'var(--text-muted)', fontWeight: 700 }}>{e.type.toUpperCase()}</span>
            </li>
          ))}
        </ul>
      </div>

      {!selectedEntity ? (
        <div className="ide-sidebar-right dev-mode">
          <div className="inspector-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>SCENE DIRECTOR</div>
            <div style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 700 }}>{currentScene?.name || 'Main Scene'}</div>
          </div>

          <div className="tool-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
            <div className="tool-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Global Gameplay Script (JS)</span>
              <span style={{ color: 'var(--accent-primary)' }}>Live Runtime</span>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-deep)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={sceneLogic.script}
                onChange={(val) => updateSceneLogic({ script: val })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 16 }
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--accent-glow)', border: '1px solid var(--border-active)', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)', fontSize: '0.8rem' }}>Engine API Dictionary</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.6' }}>
              <li><code>engine.switchScene('scene_id')</code></li>
              <li><code>engine.getEntities()</code></li>
              <li><code>engine.setFlag('hasKey', true)</code></li>
              <li><code>engine.getFlag('hasKey')</code></li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="ide-sidebar-right dev-mode">
          <div className="inspector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              value={selectedEntity.name}
              onChange={(e) => updateEntityData(selectedEntity.id, { name: e.target.value })}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 800, width: '150px' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <IconButton icon={Copy} label="Duplicate Volume" onClick={() => duplicateEntity(selectedEntity.id)} />
              <IconButton icon={Trash2} label="Delete Volume" variant="danger" onClick={() => removeEntity(selectedEntity.id)} />
            </div>
          </div>

          <div className="tool-section">
            <div className="tool-label">Volume Mask</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: selectedEntity.color }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Greybox</span>
            </div>
          </div>

          <div className="tool-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="tool-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Component Logic (JS)</span>
              <span style={{ color: 'var(--accent-primary)' }}>Live Runtime</span>
            </div>
            <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={selectedEntity.logic.script || ''}
                onChange={(val) => updateEntityLogic(selectedEntity.id, { script: val })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export function WorkspaceSwitcher({ children }) {
  const { workspaceMode, toggleWorkspaceMode, uiTheme, toggleTheme } = useUIStore(useShallow(state => ({
    workspaceMode: state.workspaceMode,
    toggleWorkspaceMode: state.toggleWorkspaceMode,
    uiTheme: state.uiTheme,
    toggleTheme: state.toggleTheme
  })));

  const {
    isPlaying, togglePlay, scenes, activeSceneId, createScene, switchScene,
    setInputKey, selectedEntityId, removeEntity, director
  } = useSceneStore(useShallow(state => ({
    isPlaying: state.isPlaying,
    togglePlay: state.togglePlay,
    scenes: state.scenes,
    activeSceneId: state.activeSceneId,
    createScene: state.createScene,
    switchScene: state.switchScene,
    setInputKey: state.setInputKey,
    selectedEntityId: state.selectedEntityId,
    removeEntity: state.removeEntity,
    director: state.director
  })));

  const { timeline, setTimeline } = useArtStore(useShallow(state => ({
    timeline: state.timeline,
    setTimeline: state.setTimeline
  })));

  const handleExport = () => {
    const sceneState = useSceneStore.getState();
    const artState = useArtStore.getState();

    const finalScenes = sceneState.scenes.map(scene =>
      scene.id === sceneState.activeSceneId ? {
        ...scene,
        entities: sceneState.entities,
        director: sceneState.director,
        artLayers: artState.artLayers
      } : scene
    );

    const manifest = {
      scenes: finalScenes,
      systemVariables: sceneState.systemVariables
    };

    const json = JSON.stringify(manifest);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stars_engine_master_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', uiTheme);
  }, [uiTheme]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (selectedEntityId && !director.isCameraLocked) {
          removeEntity(selectedEntityId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntityId, director.isCameraLocked, removeEntity]);

  useEffect(() => {
    if (!isPlaying) return;
    const onDown = (e) => setInputKey(e.code, true);
    const onUp = (e) => setInputKey(e.code, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [isPlaying, setInputKey]);

  const handleNewScene = () => {
    const name = prompt("Enter new scene name:");
    if (name) createScene(name);
  };

  return (
    <div className="ide-root" data-theme={uiTheme}>
      <div className="ide-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            <Monitor size={20} color="var(--accent-primary)" /> stars-engine
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
            <Folder size={18} color="var(--text-muted)" />
            <select
              value={activeSceneId || ''}
              onChange={e => switchScene(e.target.value)}
              style={{ background: 'transparent', border: 'none', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', outline: 'none', padding: '0.2rem', boxShadow: 'none' }}
            >
              {scenes.map(s => <option key={s.id} value={s.id} style={{ background: 'var(--option-bg)', color: 'var(--option-text)' }}>{s.name}</option>)}
            </select>
            <button onClick={handleNewScene} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }} title="New Scene">
              <Plus size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '0.25rem', border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
            <button
              onClick={() => workspaceMode !== 'artist' && toggleWorkspaceMode()}
              style={{ background: workspaceMode === 'artist' ? 'var(--bg-panel)' : 'transparent', color: workspaceMode === 'artist' ? 'var(--accent-primary)' : 'var(--text-muted)', border: '1px solid transparent', borderColor: workspaceMode === 'artist' ? 'var(--border-glass)' : 'transparent', padding: '0.4rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: workspaceMode === 'artist' ? 'var(--shadow-sm)' : 'none' }}
            >
              Artist Studio
            </button>
            <button
              onClick={() => workspaceMode !== 'dev' && toggleWorkspaceMode()}
              style={{ background: workspaceMode === 'dev' ? 'var(--bg-panel)' : 'transparent', color: workspaceMode === 'dev' ? 'var(--accent-success)' : 'var(--text-muted)', border: '1px solid transparent', borderColor: workspaceMode === 'dev' ? 'var(--border-glass)' : 'transparent', padding: '0.4rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: workspaceMode === 'dev' ? 'var(--shadow-sm)' : 'none' }}
            >
              Logic Dev
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.3s ease' }}
            title={`Switch to ${uiTheme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {uiTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600, transition: 'all 0.2s' }}>
            <Download size={16} /> Export Manifest
          </button>

          <button onClick={togglePlay} style={{ background: isPlaying ? 'var(--accent-danger)' : 'var(--btn-primary-bg)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: 'var(--btn-primary-shadow)' }}>
            {isPlaying ? <><Square size={16} fill="currentColor" /> Stop</> : <><Play size={16} fill="currentColor" /> Playtest</>}
          </button>
        </div>
      </div>

      <div className="ide-body">
        <div className="ide-center-col">
          <div className="ide-viewport-wrapper">
            {children}
          </div>

          {!isPlaying && workspaceMode === 'artist' && (
            <div className="ide-timeline">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Film size={18} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.05em' }}>ANIMATION TIMELINE</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, padding: '0 2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-deep)', padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => setTimeline({ currentFrame: Math.max(0, timeline.currentFrame - 1) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.2rem' }}><SkipBack size={16} /></button>
                    <button onClick={() => setTimeline({ isPlaying: !timeline.isPlaying })} style={{ background: timeline.isPlaying ? 'var(--btn-primary-bg)' : 'var(--bg-deep)', color: 'var(--text-inverse)', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.4rem 0.75rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}>
                      {timeline.isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <button onClick={() => setTimeline({ currentFrame: Math.min(timeline.totalFrames - 1, timeline.currentFrame + 1) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.2rem' }}><SkipForward size={16} /></button>
                  </div>

                  <div style={{ flex: 1, margin: '0 0.5rem', position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max={timeline.totalFrames - 1}
                      value={timeline.currentFrame}
                      onChange={(e) => setTimeline({ currentFrame: Number(e.target.value) })}
                      style={{ width: '100%', position: 'relative', zIndex: 2 }}
                    />
                  </div>

                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: '50px', textAlign: 'right' }}>
                    {timeline.currentFrame + 1} / {timeline.totalFrames}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <Clock size={14} /> {timeline.fps} FPS
                  </div>
                  <IconButton icon={Layers} label="Toggle Onion Skin" active={timeline.onionSkin} onClick={() => setTimeline({ onionSkin: !timeline.onionSkin })} />
                </div>
              </div>
            </div>
          )}
        </div>

        {!isPlaying && (
          workspaceMode === 'artist' ? <ArtistPanelUI /> : <DevPanelUI />
        )}
      </div>
    </div>
  );
}