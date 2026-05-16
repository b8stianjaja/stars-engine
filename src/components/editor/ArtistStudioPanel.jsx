import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

function InspectorField({ value, onChange, label, step = 0.1 }) {
    const [local, setLocal] = useState(Number(value).toFixed(2));
    useEffect(() => { setLocal(Number(value).toFixed(2)); }, [value]);

    const handleBlur = () => {
        const parsed = parseFloat(local);
        if (!isNaN(parsed)) onChange(parsed);
        else setLocal(Number(value).toFixed(2));
    };

    const modify = (amount) => {
        const target = (parseFloat(local) || 0) + amount;
        setLocal(target.toFixed(2));
        onChange(target);
    };

    return (
        <div style={{ flex: 1, display: 'flex', background: '#020204', border: '1px solid #12121a', borderRadius: '2px', alignItems: 'center', height: '18px', padding: '0 2px' }}>
            <span style={{ fontSize: '8px', fontFamily: 'monospace', color: '#475569', fontWeight: 'bold', marginRight: '3px' }}>{label}</span>
            <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} onBlur={handleBlur} style={{ width: '100%', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '9px', fontFamily: 'monospace', outline: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                <button onClick={() => modify(step)} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: '5px', cursor: 'pointer', height: '8px', padding: 0 }}>▲</button>
                <button onClick={() => modify(-step)} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: '5px', cursor: 'pointer', height: '8px', padding: 0 }}>▼</button>
            </div>
        </div>
    );
}

export function ArtistStudioPanel({ worker }) {
    const workspace = useSystemicStore(useShallow(state => state.workspace));
    const entities = useSystemicStore(useShallow(state => state.entities));
    const visuals = useSystemicStore(useShallow(state => state.visuals));
    const freeIndices = useSystemicStore(useShallow(state => state.freeIndices));
    const layerPlayback = useSystemicStore(useShallow(state => state.layerPlayback));
    const canvasLayers = useSystemicStore(useShallow(state => state.canvasLayers));

    const setView = useSystemicStore(state => state.setView);
    const toggleBlueprints = useSystemicStore(state => state.toggleBlueprints);
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const updateEntityTransform = useSystemicStore(state => state.updateEntityTransform);
    const applyGameplayPatch = useSystemicStore(state => state.applyGameplayPatch);
    const registerEntity = useSystemicStore(state => state.registerEntity);
    const removeEntity = useSystemicStore(state => state.removeEntity);
    const loadSceneState = useSystemicStore(state => state.loadSceneState);
    const setTransformMode = useSystemicStore(state => state.setTransformMode);
    const setSnapValue = useSystemicStore(state => state.setSnapValue);

    const setPaintMode = useSystemicStore(state => state.setPaintMode);
    const setBrushColor = useSystemicStore(state => state.setBrushColor);
    const setBrushSize = useSystemicStore(state => state.setBrushSize);
    const setOpacityGuide = useSystemicStore(state => state.setOpacityGuide);
    const setActiveLayerKey = useSystemicStore(state => state.setActiveLayerKey);
    const setGlobalFrameIndex = useSystemicStore(state => state.setGlobalFrameIndex);

    const [timelinePlaying, setTimelinePlaying] = useState(false);
    const selectedEntity = entities[workspace.selectedEntityId];

    useEffect(() => {
        let timer = null;
        if (timelinePlaying) {
            timer = setInterval(() => {
                const idx = useSystemicStore.getState().layerPlayback.currentFrameIndex;
                setGlobalFrameIndex((idx + 1) % 8);
            }, 166.6);
        }
        return () => { if (timer) clearInterval(timer); };
    }, [timelinePlaying, setGlobalFrameIndex]);

    const handleTransformChange = (field, subIndex, val, current) => {
        if (!workspace.selectedEntityId) return;
        let vec = [...current]; vec[subIndex] = val;
        updateEntityTransform(workspace.selectedEntityId, field, vec);
        if (worker) {
            const axes = ['x', 'y', 'z'];
            const scales = ['scaleX', 'scaleY', 'scaleZ'];
            worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: workspace.selectedEntityId, [field === 'position' ? axes[subIndex] : scales[subIndex]]: val } });
        }
    };

    const handleGameplayChange = (field, value) => {
        if (!workspace.selectedEntityId) return;
        const parsed = isNaN(value) ? value : parseFloat(value);
        applyGameplayPatch(workspace.selectedEntityId, { [field]: parsed });
    };

    const createPrefab = (type) => {
        if (freeIndices.length === 0) return;
        const nextIndex = freeIndices[freeIndices.length - 1];
        const id = `node_${type}_${Date.now().toString().slice(-4)}`;
        const defaultData = {
            index: nextIndex, name: `COLLIDER_${type.toUpperCase()}_${nextIndex}`, type, scale: [1, 1, 1],
            color: '#475569', position: [0, 0.5, 0],
            gameplay: { health: 100, maxHealth: 100, damage: 0, faction: 'neutral', inventory: [], animRow: 0, frameIndex: 0, actorState: 0 }
        };
        registerEntity(id, defaultData, 'hash_asset_default');
        if (worker) {
            worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, index: nextIndex, x: 0, y: 0.5, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, gameplay: defaultData.gameplay } });
        }
        selectEntity(id);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', height: '100%', overflowY: 'hidden' }}>

            {/* IO COMPACT ENGINE */}
            <div style={{ display: 'flex', gap: '2px', background: '#07070a', padding: '3px', borderRadius: '3px', border: '1px solid #11111a' }}>
                <button onClick={async () => await TauriBridge.saveScene({ entities, visuals, canvasLayers })} style={{ flex: 1, padding: '4px', background: '#1c0a15', border: '1px solid #3c122c', color: '#ff00aa', fontSize: '9px', fontFamily: 'monospace', cursor: 'pointer', fontWeight: 'bold' }}>EXPORT</button>
                <button onClick={async () => { const d = await TauriBridge.loadScene(); if (d) { loadSceneState(d); if (worker) worker.postMessage({ type: 'LOAD_SCENE_LOGIC', payload: Object.values(d.entities) }); } }} style={{ flex: 1, padding: '4px', background: '#0a0a0f', border: '1px solid #161622', color: '#94a3b8', fontSize: '9px', fontFamily: 'monospace', cursor: 'pointer' }}>IMPORT</button>
                <button onClick={toggleBlueprints} style={{ flex: 1.2, padding: '4px', fontSize: '9px', fontFamily: 'monospace', background: workspace.showBlueprints ? '#043425' : '#2d0a12', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    {workspace.showBlueprints ? "SCAFFOLD_ON" : "SCAFFOLD_OFF"}
                </button>
            </div>

            {/* MATRIZ DE CÁMARAS / NODOS DE ESCENA */}
            <div style={{ background: '#07070a', padding: '3px', borderRadius: '3px', border: '1px solid #11111a', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px' }}>
                {Object.keys(workspace.cameraViews).map((id) => {
                    const active = workspace.activeViewId === id;
                    return (
                        <button key={id} onClick={() => setView(id)} style={{ padding: '3px 0', background: active ? '#ff00aa1c' : '#0d0d14', border: `1px solid ${active ? '#ff00aa' : '#14141f'}`, color: active ? '#ff00aa' : '#52526b', borderRadius: '2px', fontSize: '8px', fontFamily: 'monospace', cursor: 'pointer' }}>
                            {id.toUpperCase().slice(0, 4)}
                        </button>
                    );
                })}
            </div>

            {/* MÓDULO ILUSTRACIÓN DE CALCO EN PANTALLA (OVERLAY CONTROLLER) */}
            <div style={{ background: '#07070a', padding: '5px', borderRadius: '3px', border: '1px solid #ff00aa33', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                    <span style={{ fontSize: '8px', color: '#ff00aa', fontFamily: 'monospace', fontWeight: 'bold' }}>TRACE_DRAW_OVERLAY</span>
                    <button onClick={() => setPaintMode(!layerPlayback.paintMode)} style={{ padding: '2px 6px', fontSize: '8px', fontFamily: 'monospace', background: layerPlayback.paintMode ? '#ff00aa' : '#111116', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {layerPlayback.paintMode ? "OVERLAY_ON" : "OVERLAY_OFF"}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '1px' }}>
                    {['background', 'midground', 'foreground'].map(key => (
                        <button key={key} onClick={() => setActiveLayerKey(key)} style={{ flex: 1, padding: '3px', fontSize: '8px', fontFamily: 'monospace', background: layerPlayback.activeLayerKey === key ? '#ff00aa' : '#0d0d14', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>
                            {key.toUpperCase().slice(0, 4)}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <button onClick={() => setTimelinePlaying(!timelinePlaying)} style={{ background: timelinePlaying ? '#ef4444' : '#10b981', color: '#fff', border: 'none', padding: '2px 5px', borderRadius: '2px', fontSize: '8px', cursor: 'pointer' }}>
                        {timelinePlaying ? "■" : "▶"}
                    </button>
                    <div style={{ flex: 1, display: 'flex', gap: '1px' }}>
                        {Array.from({ length: 8 }).map((_, i) => {
                            const active = layerPlayback.currentFrameIndex === i;
                            const hasArt = canvasLayers[workspace.activeViewId]?.[layerPlayback.activeLayerKey]?.[i];
                            return (
                                <div key={i} onClick={() => setGlobalFrameIndex(i)} style={{ flex: 1, height: '11px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: active ? '#ff00aa' : (hasArt ? '#27273a' : '#11111a'), color: '#fff', fontFamily: 'monospace', borderRadius: '1px' }}>
                                    {i}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {layerPlayback.paintMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#020204', padding: '3px', borderRadius: '2px' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input type="color" value={layerPlayback.brushColor} onChange={(e) => setBrushColor(e.target.value)} style={{ width: '16px', height: '14px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} />
                            <input type="range" min="2" max="24" value={layerPlayback.brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={{ flex: 1, accentColor: '#ff00aa', height: '2px' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontSize: '7px', color: '#475569', fontFamily: 'monospace' }}>SCAFFOLD_ALPHA:</span>
                            <input type="range" min="0" max="1" step="0.1" value={layerPlayback.opacityGuide} onChange={(e) => setOpacityGuide(parseFloat(e.target.value))} style={{ width: '60px', accentColor: '#6366f1', height: '2px' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* MONTAJE DE COLLIDERS TRIDIDMENSIONALES */}
            <div style={{ background: '#07070a', padding: '4px', borderRadius: '3px', border: '1px solid #11111a', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1px' }}>
                    {[['box', '■'], ['pyramid', '▲'], ['sphere', '●'], ['cylinder', '⬢'], ['plane', '▬'], ['torus', '⌾']].map(([t, icon]) => (
                        <button key={t} onClick={() => createPrefab(t)} title={`SPAWN_BLOCK_${t.toUpperCase()}`} style={{ padding: '3px 0', background: '#0d0d14', border: '1px solid #14141f', color: '#a1a1aa', fontSize: '9px', borderRadius: '2px', cursor: 'pointer' }}>
                            {icon}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={() => setTransformMode('translate')} style={{ flex: 1, padding: '3px 0', fontSize: '8px', fontFamily: 'monospace', background: workspace.transformMode === 'translate' ? '#ff00aa' : '#0d0d14', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>[W] GIZMO_POS</button>
                    <button onClick={() => setTransformMode('scale')} style={{ flex: 1, padding: '3px 0', fontSize: '8px', fontFamily: 'monospace', background: workspace.transformMode === 'scale' ? '#ff00aa' : '#0d0d14', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>[R] GIZMO_SCALE</button>
                    <select value={workspace.snapValue} onChange={(e) => setSnapValue(parseFloat(e.target.value))} style={{ flex: 1, background: '#020204', border: '1px solid #14141f', color: '#ff00aa', fontSize: '8px', padding: '2px', borderRadius: '2px', fontFamily: 'monospace', outline: 'none' }}>
                        <option value="0">SNAP_FREE</option>
                        <option value="0.5">GRID_0.5m</option>
                        <option value="1.0">GRID_1.0m</option>
                    </select>
                </div>
            </div>

            {/* SCENE GRAPH CON INSPECTOR PARAMÉTRICO DE ESTADOS DE ANIMACIÓN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#07070a', padding: '4px', borderRadius: '3px', border: '1px solid #11111a', overflow: 'hidden' }}>
                <div style={{ flex: selectedEntity ? 0.35 : 1, overflowY: 'auto', background: '#020204', padding: '2px', borderRadius: '2px' }}>
                    {Object.keys(entities).map(id => (
                        <div key={id} onClick={() => selectEntity(id)} style={{ padding: '3px 4px', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '2px', marginBottom: '1px', background: workspace.selectedEntityId === id ? '#ff00aa15' : 'transparent', color: workspace.selectedEntityId === id ? '#ff00aa' : '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{entities[id].name}</span>
                            <span onClick={(e) => { e.stopPropagation(); removeEntity(id); if (worker) worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id } }); }} style={{ color: '#3f3f46', padding: '0 2px' }} onMouseOver={(e) => e.target.style.color = '#ef4444'} onMouseOut={(e) => e.target.style.color = '#3f3f46'}>[X]</span>
                        </div>
                    ))}
                </div>

                {selectedEntity && (
                    <div style={{ flex: 0.65, borderTop: '1px solid #ff00aa33', paddingTop: '3px', marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <input type="text" value={selectedEntity.name} onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'name', e.target.value)} style={{ flex: 1, background: '#020204', border: '1px solid #11111a', color: '#fff', fontSize: '9px', fontFamily: 'monospace', padding: '2px', borderRadius: '2px', outline: 'none' }} />
                            <input type="color" value={selectedEntity.color} onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'color', e.target.value)} style={{ background: 'transparent', border: 'none', width: '16px', height: '14px', cursor: 'pointer', padding: 0 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            {[0, 1, 2].map(i => (
                                <InspectorField key={i} label={['X', 'Y', 'Z'][i]} value={selectedEntity.position[i]} onChange={(val) => handleTransformChange('position', i, val, selectedEntity.position)} />
                            ))}
                        </div>

                        {/* MATRIZ DE CONFIGURACIÓN DE SPRITES PROGRAMABLES */}
                        <div style={{ background: '#020204', padding: '3px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: '8px', color: '#ff00aa', fontFamily: 'monospace', fontWeight: 'bold' }}>GAMEPLAY_PAGING_INDEX</div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#07070a', padding: '0 2px', height: '16px', borderRadius: '2px' }}>
                                    <span style={{ fontSize: '7px', color: '#475569', fontFamily: 'monospace', marginRight: '2px' }}>ROW:</span>
                                    <input type="number" value={selectedEntity.gameplay.animRow} onChange={(e) => handleGameplayChange('animRow', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '8px', outline: 'none', fontFamily: 'monospace' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#07070a', padding: '0 2px', height: '16px', borderRadius: '2px' }}>
                                    <span style={{ fontSize: '7px', color: '#475569', fontFamily: 'monospace', marginRight: '2px' }}>FRAME:</span>
                                    <input type="number" value={selectedEntity.gameplay.frameIndex} onChange={(e) => handleGameplayChange('frameIndex', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '8px', outline: 'none', fontFamily: 'monospace' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#07070a', padding: '0 2px', height: '16px', borderRadius: '2px' }}>
                                    <span style={{ fontSize: '7px', color: '#475569', fontFamily: 'monospace', marginRight: '2px' }}>STATE:</span>
                                    <input type="number" value={selectedEntity.gameplay.actorState} onChange={(e) => handleGameplayChange('actorState', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '8px', outline: 'none', fontFamily: 'monospace' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#020204', padding: '3px', borderRadius: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>HEALTH:</span>
                                <div style={{ display: 'flex', gap: '1px' }}>
                                    <input type="number" value={selectedEntity.gameplay.health} onChange={(e) => handleGameplayChange('health', e.target.value)} style={{ width: '28px', background: '#07070a', border: '1px solid #11111a', color: '#00ff66', fontSize: '8px', textAlign: 'center', outline: 'none' }} />
                                    <input type="number" value={selectedEntity.gameplay.maxHealth} onChange={(e) => handleGameplayChange('maxHealth', e.target.value)} style={{ width: '28px', background: '#07070a', border: '1px solid #11111a', color: '#475569', fontSize: '8px', textAlign: 'center', outline: 'none' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>DMG:</span>
                                <input type="number" value={selectedEntity.gameplay.damage} onChange={(e) => handleGameplayChange('damage', e.target.value)} style={{ width: '57px', background: '#07070a', border: '1px solid #11111a', color: '#ef4444', fontSize: '8px', textAlign: 'center', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>FACTION:</span>
                                <select value={selectedEntity.gameplay.faction} onChange={(e) => handleGameplayChange('faction', e.target.value)} style={{ width: '57px', background: '#07070a', border: '1px solid #11111a', color: '#eab308', fontSize: '8px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="player">PLAYER</option>
                                    <option value="enemy">ENEMY</option>
                                    <option value="neutral">NEUTRAL</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}