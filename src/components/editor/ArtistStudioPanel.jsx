import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

function InspectorField({ value, onChange, label, step = 0.1 }) {
    const [local, setLocal] = useState(Number(value).toFixed(2));

    useEffect(() => {
        setLocal(Number(value).toFixed(2));
    }, [value]);

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
        <div style={{ flex: 1, display: 'flex', background: '#050508', border: '1px solid #14141f', borderRadius: '2px', alignItems: 'center', height: '18px', padding: '0 2px' }}>
            <span style={{ fontSize: '8px', fontFamily: 'monospace', color: '#475569', fontWeight: 'bold', marginRight: '3px' }}>{label}</span>
            <input
                type="text"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={handleBlur}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '9px', fontFamily: 'monospace', outline: 'none', padding: 0 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                <button onClick={() => modify(step)} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: '6px', cursor: 'pointer', height: '8px', padding: 0 }}>▲</button>
                <button onClick={() => modify(-step)} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: '6px', cursor: 'pointer', height: '8px', padding: 0 }}>▼</button>
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

    const updateLayerAssetFrame = useSystemicStore(state => state.updateLayerAssetFrame);
    const setActiveLayerKey = useSystemicStore(state => state.setActiveLayerKey);
    const setGlobalFrameIndex = useSystemicStore(state => state.setGlobalFrameIndex);

    const [isPlaying, setIsPlaying] = useState(false);
    const selectedEntity = entities[workspace.selectedEntityId];

    useEffect(() => {
        let interval = null;
        if (isPlaying) {
            interval = setInterval(() => {
                const currentIndex = useSystemicStore.getState().layerPlayback.currentFrameIndex;
                setGlobalFrameIndex((currentIndex + 1) % 8);
            }, 166.6);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isPlaying, setGlobalFrameIndex]);

    const handleTransformChange = (field, subIndex, numericValue, currentVector) => {
        if (!workspace.selectedEntityId) return;
        let newVector = [...currentVector];
        newVector[subIndex] = numericValue;
        updateEntityTransform(workspace.selectedEntityId, field, newVector);

        if (worker) {
            const axisKey = subIndex === 0 ? 'x' : subIndex === 1 ? 'y' : 'z';
            const scaleKey = subIndex === 0 ? 'scaleX' : subIndex === 1 ? 'scaleY' : 'scaleZ';
            worker.postMessage({
                type: 'UPDATE_PHYSICAL_POS',
                payload: { id: workspace.selectedEntityId, [field === 'position' ? axisKey : scaleKey]: numericValue }
            });
        }
    };

    const handleGameplayChange = (field, value) => {
        if (!workspace.selectedEntityId) return;
        const parsed = isNaN(value) ? value : parseFloat(value);
        applyGameplayPatch(workspace.selectedEntityId, { [field]: parsed });
        if (worker) {
            worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: workspace.selectedEntityId, gameplay: { [field]: parsed } } });
        }
    };

    const createPrefab = (type) => {
        if (freeIndices.length === 0) return;
        const nextIndex = freeIndices[freeIndices.length - 1];
        const id = `node_${type}_${Date.now().toString().slice(-4)}`;
        const colorMap = { box: '#3b82f6', pyramid: '#eab308', sphere: '#ec4899', cylinder: '#10b981', plane: '#64748b', torus: '#a855f7' };

        const defaultData = {
            index: nextIndex,
            name: `${type.toUpperCase()}_${nextIndex}`,
            type: type,
            scale: [1, 1, 1],
            color: colorMap[type] || '#6366f1',
            position: [0, 0.5, 0],
            gameplay: { health: 100, maxHealth: 100, damage: 15, faction: 'neutral', inventory: [] }
        };

        registerEntity(id, defaultData, 'hash_asset_default');
        if (worker) {
            worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, index: nextIndex, x: 0, y: 0.5, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, gameplay: defaultData.gameplay } });
        }
        selectEntity(id);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', overflowY: 'hidden' }}>

            {/* CONTROL DE ENTORNO COMPACTO */}
            <div style={{ display: 'flex', gap: '2px', background: '#09090f', padding: '4px', borderRadius: '3px', border: '1px solid #14141f' }}>
                <button onClick={async () => await TauriBridge.saveScene({ entities, visuals, canvasLayers })} style={{ flex: 1, padding: '4px', background: '#1c0a15', border: '1px solid #3c122c', color: '#ff00aa', fontSize: '9px', fontFamily: 'monospace', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}>SAVE</button>
                <button onClick={async () => { const d = await TauriBridge.loadScene(); if (d) { loadSceneState(d); if (worker) worker.postMessage({ type: 'LOAD_SCENE_LOGIC', payload: Object.values(d.entities) }); } }} style={{ flex: 1, padding: '4px', background: '#111116', border: '1px solid #1c1c24', color: '#94a3b8', fontSize: '9px', fontFamily: 'monospace', borderRadius: '2px', cursor: 'pointer' }}>LOAD</button>
                <button onClick={toggleBlueprints} style={{ flex: 1.5, padding: '4px', fontSize: '9px', fontFamily: 'monospace', background: workspace.showBlueprints ? '#064e3b' : '#3b0712', border: 'none', color: '#fff', borderRadius: '2px', cursor: 'pointer' }}>
                    {workspace.showBlueprints ? "SOLID" : "WIREFRAME"}
                </button>
            </div>

            {/* MATRIZ DE CÁMARAS DCC COMPRESA */}
            <div style={{ background: '#09090f', padding: '4px', borderRadius: '3px', border: '1px solid #14141f' }}>
                <div style={{ gridTemplateColumns: 'repeat(5, 1fr)', display: 'grid', gap: '2px' }}>
                    {Object.keys(workspace.cameraViews).map((id) => {
                        const active = workspace.activeViewId === id;
                        return (
                            <button key={id} onClick={() => setView(id)} style={{ padding: '4px 0', background: active ? '#ff00aa1c' : '#111116', border: `1px solid ${active ? '#ff00aa' : '#1c1c24'}`, color: active ? '#ff00aa' : '#64748b', borderRadius: '2px', fontSize: '8px', fontFamily: 'monospace', cursor: 'pointer', textTransform: 'uppercase', fontWeight: active ? 'bold' : 'normal' }}>
                                {id.slice(0, 4)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SHELF INTEGRADO: PRIMITIVAS + CONTROLES CAD */}
            <div style={{ background: '#09090f', padding: '6px', borderRadius: '3px', border: '1px solid #14141f', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2px' }}>
                    {[['box', '■'], ['pyramid', '▲'], ['sphere', '●'], ['cylinder', '⬢'], ['plane', '▬'], ['torus', '⌾']].map(([t, icon]) => (
                        <button key={t} onClick={() => createPrefab(t)} title={`Spawn ${t.toUpperCase()}`} style={{ padding: '4px 0', background: '#111116', border: '1px solid #1c1c24', color: '#e2e8f0', fontSize: '10px', borderRadius: '2px', cursor: 'pointer' }}>
                            {icon}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <button onClick={() => setTransformMode('translate')} style={{ flex: 1, padding: '3px 0', fontSize: '8px', fontFamily: 'monospace', background: workspace.transformMode === 'translate' ? '#ff00aa' : '#111116', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>[W] TRANS</button>
                    <button onClick={() => setTransformMode('scale')} style={{ flex: 1, padding: '3px 0', fontSize: '8px', fontFamily: 'monospace', background: workspace.transformMode === 'scale' ? '#ff00aa' : '#111116', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>[R] SCALE</button>
                    <select value={workspace.snapValue} onChange={(e) => setSnapValue(parseFloat(e.target.value))} style={{ flex: 1.2, background: '#050508', border: '1px solid #1c1c24', color: '#ff00aa', fontSize: '8px', padding: '3px', borderRadius: '2px', fontFamily: 'monospace', outline: 'none' }}>
                        <option value="0">SNAP_OFF</option>
                        <option value="0.5">GRID_0.5m</option>
                        <option value="1.0">GRID_1.0m</option>
                    </select>
                </div>
            </div>

            {/* LIENZO DE ANIMACIÓN Y CAPAS MATTE */}
            <div style={{ background: '#09090f', padding: '6px', borderRadius: '3px', border: '1px solid #ff00aa33', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                    {['background', 'midground', 'foreground'].map(layerKey => (
                        <button key={layerKey} onClick={() => setActiveLayerKey(layerKey)} style={{ flex: 1, padding: '3px', fontSize: '8px', fontFamily: 'monospace', background: layerPlayback.activeLayerKey === layerKey ? '#ff00aa' : '#111116', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer', textTransform: 'uppercase' }}>
                            {layerKey.slice(0, 4)}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#050508', padding: '3px', borderRadius: '2px', border: '1px solid #14141f' }}>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: isPlaying ? '#ef4444' : '#10b981', color: '#fff', border: 'none', padding: '2px 4px', borderRadius: '2px', fontSize: '8px', fontFamily: 'monospace', cursor: 'pointer' }}>
                        {isPlaying ? '■' : '▶'}
                    </button>
                    <div style={{ flex: 1, display: 'flex', gap: '1px' }}>
                        {Array.from({ length: 8 }).map((_, i) => {
                            const active = layerPlayback.currentFrameIndex === i;
                            const hasData = canvasLayers[workspace.activeViewId]?.[layerPlayback.activeLayerKey]?.[i];
                            return (
                                <div key={i} onClick={() => setGlobalFrameIndex(i)} style={{ flex: 1, height: '12px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '1px', cursor: 'pointer', background: active ? '#ff00aa' : (hasData ? '#334155' : '#14141f'), color: '#fff', fontFamily: 'monospace' }}>
                                    {i}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ESCENE GRAPH CON INSPECTOR INTEGRADO */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09090f', padding: '6px', borderRadius: '3px', border: '1px solid #14141f', overflow: 'hidden' }}>
                <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '3px' }}>SCENE_INTEGRATED_OUTLINER</div>
                <div style={{ flex: selectedEntity ? 0.4 : 1, overflowY: 'auto', background: '#050508', padding: '2px', borderRadius: '2px', border: '1px solid #14141f' }}>
                    {Object.keys(entities).map(id => (
                        <div key={id} onClick={() => selectEntity(id)} style={{ padding: '3px 4px', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '2px', marginBottom: '1px', background: workspace.selectedEntityId === id ? '#ff00aa15' : 'transparent', color: workspace.selectedEntityId === id ? '#ff00aa' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{entities[id].name}</span>
                            <span onClick={(e) => { e.stopPropagation(); removeEntity(id); if (worker) worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id } }); }} style={{ color: '#475569', padding: '0 2px' }} onMouseOver={(e) => e.target.style.color = '#ef4444'} onMouseOut={(e) => e.target.style.color = '#475569'}>[X]</span>
                        </div>
                    ))}
                </div>

                {/* INSPECTOR COMPACTO INCUSTADO */}
                {selectedEntity && (
                    <div style={{ flex: 0.6, borderTop: '1px solid #ff00aa40', paddingTop: '4px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <input type="text" value={selectedEntity.name} onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'name', e.target.value)} style={{ flex: 1, background: '#050508', border: '1px solid #14141f', color: '#fff', fontSize: '9px', fontFamily: 'monospace', padding: '2px', borderRadius: '2px', outline: 'none' }} />
                            <input type="color" value={selectedEntity.color} onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'color', e.target.value)} style={{ background: 'transparent', border: 'none', width: '18px', height: '16px', cursor: 'pointer', padding: 0 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            {[0, 1, 2].map(i => (
                                <InspectorField key={i} label={['X', 'Y', 'Z'][i]} value={selectedEntity.position[i]} onChange={(val) => handleTransformChange('position', i, val, selectedEntity.position)} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#050508', padding: '3px', borderRadius: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>HP:</span>
                                <div style={{ display: 'flex', gap: '1px' }}>
                                    <input type="number" value={selectedEntity.gameplay.health} onChange={(e) => handleGameplayChange('health', e.target.value)} style={{ width: '32px', background: '#09090f', border: '1px solid #14141f', color: '#00ff66', fontSize: '8px', textAlign: 'center', outline: 'none' }} />
                                    <input type="number" value={selectedEntity.gameplay.maxHealth} onChange={(e) => handleGameplayChange('maxHealth', e.target.value)} style={{ width: '32px', background: '#09090f', border: '1px solid #14141f', color: '#475569', fontSize: '8px', textAlign: 'center', outline: 'none' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>ATK:</span>
                                <input type="number" value={selectedEntity.gameplay.damage} onChange={(e) => handleGameplayChange('damage', e.target.value)} style={{ width: '65px', background: '#09090f', border: '1px solid #14141f', color: '#ef4444', fontSize: '8px', textAlign: 'center', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>TEAM:</span>
                                <select value={selectedEntity.gameplay.faction} onChange={(e) => handleGameplayChange('faction', e.target.value)} style={{ width: '65px', background: '#09090f', border: '1px solid #14141f', color: '#eab308', fontSize: '8px', outline: 'none', cursor: 'pointer' }}>
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