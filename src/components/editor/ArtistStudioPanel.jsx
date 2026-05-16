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
        <div style={{
            flex: 1,
            display: 'flex',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            alignItems: 'center',
            height: '26px',
            padding: '0 8px',
            justifyContent: 'space-between'
        }}>
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)' }}>{label}</span>
            <input
                type="text"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={handleBlur}
                style={{
                    width: '60%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    textAlign: 'right',
                    outline: 'none',
                    fontWeight: '500'
                }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: '4px' }}>
                <button onClick={() => modify(step)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '7px', cursor: 'pointer', height: '10px', padding: 0 }}>▲</button>
                <button onClick={() => modify(-step)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '7px', cursor: 'pointer', height: '10px', padding: 0 }}>▼</button>
            </div>
        </div>
    );
}

function SectionHeader({ title }) {
    return (
        <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
            marginTop: '10px',
            marginBottom: '4px'
        }}>
            {title}
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

        let labelES = 'Bloque';
        if (type === 'sphere') labelES = 'Esfera';
        if (type === 'cylinder') labelES = 'Cilindro';
        if (type === 'pyramid') labelES = 'Pirámide';

        const defaultData = {
            index: nextIndex, name: `${labelES} ${nextIndex}`, type, scale: [1, 1, 1],
            color: '#8e8e93', position: [0, 0.5, 0],
            gameplay: { health: 100, maxHealth: 100, damage: 0, faction: 'neutral', inventory: [], animRow: 0, frameIndex: 0, actorState: 0 }
        };
        registerEntity(id, defaultData, 'hash_asset_default');
        if (worker) {
            worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, index: nextIndex, x: 0, y: 0.5, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, gameplay: defaultData.gameplay } });
        }
        selectEntity(id);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'hidden' }}>

            {/* ALMACENAMIENTO DE PROYECTO */}
            <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={async () => await TauriBridge.saveScene({ entities, visuals, canvasLayers })} style={{ flex: 1, padding: '7px', background: 'var(--bg-active)', border: 'none', color: 'var(--text-active)', fontSize: '11px', fontWeight: '600', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>Guardar</button>
                <button onClick={async () => { const d = await TauriBridge.loadScene(); if (d) { loadSceneState(d); if (worker) worker.postMessage({ type: 'LOAD_SCENE_LOGIC', payload: Object.values(d.entities) }); } }} style={{ flex: 1, padding: '7px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '500', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cargar</button>
                <button onClick={toggleBlueprints} style={{ flex: 1.4, padding: '7px', fontSize: '11px', fontWeight: '500', background: workspace.showBlueprints ? 'var(--accent-subtle)' : 'var(--bg-input)', border: workspace.showBlueprints ? '1px solid var(--accent)' : '1px solid var(--border)', color: workspace.showBlueprints ? 'var(--accent)' : 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {workspace.showBlueprints ? "Guías: Sí" : "Guías: No"}
                </button>
            </div>

            {/* VISTAS DE CÁMARA */}
            <div>
                <SectionHeader title="Cámaras de Trabajo" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
                    {Object.keys(workspace.cameraViews).map((id) => {
                        const active = workspace.activeViewId === id;
                        const translations = { persp: 'Persp', front: 'Front', top: 'Sup', left: 'Izq', right: 'Der' };
                        return (
                            <button key={id} onClick={() => setView(id)} style={{ padding: '5px 0', background: active ? 'var(--bg-panel)' : 'transparent', border: 'none', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: active ? '600' : '500', borderRadius: 'var(--radius-sm)', fontSize: '11px', cursor: 'pointer', boxShadow: active ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
                                {translations[id] || id.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ENTORNO DE DIBUJO E ILUSTRACIÓN */}
            <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>Capa de Calco Manual</span>
                    <button onClick={() => setPaintMode(!layerPlayback.paintMode)} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: layerPlayback.paintMode ? 'var(--bg-active)' : 'var(--bg-input)', color: layerPlayback.paintMode ? 'var(--text-active)' : 'var(--text-main)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s' }}>
                        {layerPlayback.paintMode ? "Dibujo: Activo" : "Dibujo: Inactivo"}
                    </button>
                </div>

                <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
                    {[['background', 'Fondo'], ['midground', 'Medio'], ['foreground', 'Frente']].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveLayerKey(key)} style={{ flex: 1, padding: '5px', fontSize: '11px', fontWeight: layerPlayback.activeLayerKey === key ? '600' : '500', background: layerPlayback.activeLayerKey === key ? 'var(--bg-panel)' : 'transparent', color: layerPlayback.activeLayerKey === key ? 'var(--accent)' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: layerPlayback.activeLayerKey === key ? 'var(--shadow-sm)' : 'none' }}>
                            {label}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setTimelinePlaying(!timelinePlaying)} style={{ background: timelinePlaying ? '#ff453a' : '#34c759', color: '#fff', border: 'none', width: '22px', height: '22px', borderRadius: '50%', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {timelinePlaying ? "❙❙" : "▶"}
                    </button>
                    <div style={{ flex: 1, display: 'flex', gap: '3px' }}>
                        {Array.from({ length: 8 }).map((_, i) => {
                            const active = layerPlayback.currentFrameIndex === i;
                            const hasArt = canvasLayers[workspace.activeViewId]?.[layerPlayback.activeLayerKey]?.[i];
                            return (
                                <div key={i} onClick={() => setGlobalFrameIndex(i)} style={{ flex: 1, height: '16px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: active ? 'var(--bg-active)' : (hasArt ? 'var(--accent-subtle)' : 'var(--bg-input)'), color: active ? 'var(--text-active)' : (hasArt ? 'var(--accent)' : 'var(--text-secondary)'), borderRadius: '4px', border: active ? 'none' : '1px solid var(--border)', transition: 'all 0.15s' }}>
                                    {i + 1}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {layerPlayback.paintMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--radius-md)', marginTop: '2px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={layerPlayback.brushColor} onChange={(e) => setBrushColor(e.target.value)} style={{ width: '24px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} />
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pincel:</span>
                            <input type="range" min="2" max="24" value={layerPlayback.brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)', height: '4px' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Opacidad de base:</span>
                            <input type="range" min="0" max="1" step="0.1" value={layerPlayback.opacityGuide} onChange={(e) => setOpacityGuide(parseFloat(e.target.value))} style={{ width: '100px', accentColor: 'var(--accent)', height: '4px' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* MODELADO Y POSICIONAMIENTO TRIDIMENSIONAL */}
            <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>Objetos de Escena</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {[['box', 'Cubo'], ['pyramid', 'Pirámide'], ['sphere', 'Esfera'], ['cylinder', 'Cilindro'], ['plane', 'Plano'], ['torus', 'Toro']].map(([t, labelES]) => (
                        <button key={t} onClick={() => createPrefab(t)} style={{ padding: '6px 0', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '500', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={(e) => e.target.style.background = 'var(--bg-input-hover)'} onMouseLeave={(e) => e.target.style.background = 'var(--bg-input)'}>
                            {labelES}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    <button onClick={() => setTransformMode('translate')} style={{ flex: 1, padding: '6px 0', fontSize: '11px', fontWeight: '600', background: workspace.transformMode === 'translate' ? 'var(--bg-active)' : 'var(--bg-input)', color: workspace.transformMode === 'translate' ? 'var(--text-active)' : 'var(--text-main)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Mover</button>
                    <button onClick={() => setTransformMode('scale')} style={{ flex: 1, padding: '6px 0', fontSize: '11px', fontWeight: '600', background: workspace.transformMode === 'scale' ? 'var(--bg-active)' : 'var(--bg-input)', color: workspace.transformMode === 'scale' ? 'var(--text-active)' : 'var(--text-main)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Escalar</button>
                    <select value={workspace.snapValue} onChange={(e) => setSnapValue(parseFloat(e.target.value))} style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '500', padding: '4px', borderRadius: 'var(--radius-sm)', outline: 'none', cursor: 'pointer' }}>
                        <option value="0">Libre</option>
                        <option value="0.5">Rejilla 0.5m</option>
                        <option value="1.0">Rejilla 1.0m</option>
                    </select>
                </div>
            </div>

            {/* LISTA E INSPECTOR DINÁMICO */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600', marginBottom: '6px' }}>Árbol de Componentes</span>

                <div style={{ flex: selectedEntity ? 0.35 : 1, overflowY: 'auto', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {Object.keys(entities).map(id => (
                        <div key={id} onClick={() => selectEntity(id)} style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', marginBottom: '3px', background: workspace.selectedEntityId === id ? 'var(--accent-subtle)' : 'transparent', color: workspace.selectedEntityId === id ? 'var(--accent)' : 'var(--text-main)', fontWeight: workspace.selectedEntityId === id ? '600' : '400', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.1s' }}>
                            <span>{entities[id].name}</span>
                            <span onClick={(e) => { e.stopPropagation(); removeEntity(id); if (worker) worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id } }); }} style={{ color: 'var(--text-secondary)', padding: '0 4px', fontSize: '11px', fontWeight: 'bold' }} onMouseOver={(e) => e.target.style.color = '#ff453a'} onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}>✕</span>
                        </div>
                    ))}
                </div>

                {selectedEntity && (
                    <div style={{ flex: 0.65, borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                        {/* PROPIEDADES BÁSICAS */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input type="text" value={selectedEntity.name} onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'name', e.target.value)} style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '500', padding: '5px 8px', borderRadius: 'var(--radius-sm)', outline: 'none' }} />
                            <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '50%', background: selectedEntity.color, border: '2px solid var(--border-strong)', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                                <input type="color" value={selectedEntity.color} onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'color', e.target.value)} style={{ position: 'absolute', top: -5, left: -5, width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer' }} />
                            </div>
                        </div>

                        {/* TRANSFORMADAS DE POSICIÓN */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[0, 1, 2].map(i => (
                                <InspectorField key={i} label={['X', 'Y', 'Z'][i]} value={selectedEntity.position[i]} onChange={(val) => handleTransformChange('position', i, val, selectedEntity.position)} />
                            ))}
                        </div>

                        {/* AJUSTES GRÁFICOS DE SPRITE */}
                        <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Configuración de Animación (Sprite)</div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-panel)', padding: '0 6px', height: '24px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginRight: '4px' }}>Fila:</span>
                                    <input type="number" value={selectedEntity.gameplay.animRow} onChange={(e) => handleGameplayChange('animRow', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '11px', fontWeight: '500', outline: 'none' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-panel)', padding: '0 6px', height: '24px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginRight: '4px' }}>Frame:</span>
                                    <input type="number" value={selectedEntity.gameplay.frameIndex} onChange={(e) => handleGameplayChange('frameIndex', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '11px', fontWeight: '500', outline: 'none' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-panel)', padding: '0 6px', height: '24px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginRight: '4px' }}>Estado:</span>
                                    <input type="number" value={selectedEntity.gameplay.actorState} onChange={(e) => handleGameplayChange('actorState', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '11px', fontWeight: '500', outline: 'none' }} />
                                </div>
                            </div>
                        </div>

                        {/* ATRIBUTOS ADICIONALES */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Puntos de Vida:</span>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <input type="number" value={selectedEntity.gameplay.health} onChange={(e) => handleGameplayChange('health', e.target.value)} style={{ width: '32px', background: 'var(--bg-panel)', border: '1px solid var(--border)', color: '#34c759', fontSize: '11px', fontWeight: '600', textAlign: 'center', borderRadius: '4px', padding: '2px 0', outline: 'none' }} />
                                    <input type="number" value={selectedEntity.gameplay.maxHealth} onChange={(e) => handleGameplayChange('maxHealth', e.target.value)} style={{ width: '32px', background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'center', borderRadius: '4px', padding: '2px 0', outline: 'none' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Fuerza / Daño:</span>
                                <input type="number" value={selectedEntity.gameplay.damage} onChange={(e) => handleGameplayChange('damage', e.target.value)} style={{ width: '66px', background: 'var(--bg-panel)', border: '1px solid var(--border)', color: '#ff3b30', fontSize: '11px', fontWeight: '600', textAlign: 'center', borderRadius: '4px', padding: '2px 0', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Bando / Facción:</span>
                                <select value={selectedEntity.gameplay.faction} onChange={(e) => handleGameplayChange('faction', e.target.value)} style={{ width: '80px', background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '500', outline: 'none', cursor: 'pointer', borderRadius: '4px', padding: '2px' }}>
                                    <option value="player">Jugador</option>
                                    <option value="enemy">Enemigo</option>
                                    <option value="neutral">Neutral</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}