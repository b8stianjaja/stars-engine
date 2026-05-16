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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#050508',
                border: '1px solid #14141f',
                borderRadius: '3px',
                padding: '2px 4px'
            }}>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', marginRight: '4px', fontWeight: 'bold' }}>{label}</span>
                <input
                    type="text"
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    onBlur={handleBlur}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '10px', fontFamily: 'monospace', outline: 'none', padding: '1px 0' }}
                />
            </div>
            <div style={{ display: 'flex', gap: '1px' }}>
                <button onClick={() => modify(-step)} style={{ flex: 1, background: '#09090f', border: '1px solid #14141f', color: '#475569', fontSize: '8px', cursor: 'pointer', padding: '1px 0', borderRadius: '2px' }}>-</button>
                <button onClick={() => modify(step)} style={{ flex: 1, background: '#09090f', border: '1px solid #14141f', color: '#475569', fontSize: '8px', cursor: 'pointer', padding: '1px 0', borderRadius: '2px' }}>+</button>
            </div>
        </div>
    );
}

export function ArtistStudioPanel({ worker }) {
    const workspace = useSystemicStore(useShallow(state => state.workspace));
    const entities = useSystemicStore(useShallow(state => state.entities));
    const visuals = useSystemicStore(useShallow(state => state.visuals));
    const freeIndices = useSystemicStore(useShallow(state => state.freeIndices));

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

    const selectedEntity = entities[workspace.selectedEntityId];

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

        const defaultData = {
            index: nextIndex,
            name: `${type.toUpperCase()}_UNITS_${nextIndex}`,
            type: type,
            scale: [1, 1, 1],
            color: type === 'pyramid' ? '#eab308' : '#3b82f6',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', overflowY: 'auto' }}>

            {/* SECCIÓN 1: PIPELINE DE SERIALIZACIÓN */}
            <div style={{ background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #14141f' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={async () => await TauriBridge.saveScene({ entities, visuals })} style={{ flex: 1, padding: '5px', background: '#1c0a15', border: '1px solid #3c122c', color: '#ff00aa', fontSize: '10px', fontFamily: '"Fira Code", monospace', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>EXPORT_JSON</button>
                    <button onClick={async () => { const d = await TauriBridge.loadScene(); if (d) { loadSceneState(d); if (worker) worker.postMessage({ type: 'LOAD_SCENE_LOGIC', payload: Object.values(d.entities) }); } }} style={{ flex: 1, padding: '5px', background: '#111116', border: '1px solid #1c1c24', color: '#94a3b8', fontSize: '10px', fontFamily: '"Fira Code", monospace', borderRadius: '3px', cursor: 'pointer' }}>IMPORT_JSON</button>
                </div>
            </div>

            {/* SECCIÓN 2: TRANSFORM CONTROLS CAD */}
            <div style={{ background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #14141f', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={() => setTransformMode('translate')} style={{ flex: 1, padding: '5px', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', background: workspace.transformMode === 'translate' ? '#ff00aa' : '#111116', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>TRANSLATE</button>
                    <button onClick={() => setTransformMode('scale')} style={{ flex: 1, padding: '5px', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', background: workspace.transformMode === 'scale' ? '#ff00aa' : '#111116', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>SCALE</button>
                </div>
                <select value={workspace.snapValue} onChange={(e) => setSnapValue(parseFloat(e.target.value))} style={{ width: '100%', background: '#050508', border: '1px solid #1c1c24', color: '#ff00aa', fontSize: '10px', padding: '5px', borderRadius: '3px', fontFamily: 'monospace', outline: 'none', cursor: 'pointer' }}>
                    <option value="0">FREE_TRANSFORM_SNAP</option>
                    <option value="0.5">INCREMENTAL_0.5m_GRID</option>
                    <option value="1.0">INCREMENTAL_1.0m_GRID</option>
                </select>
            </div>

            {/* SECCIÓN 3: PALETA DE PREFABS PRIMITIVOS */}
            <div style={{ background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #14141f' }}>
                <div style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px' }}>PREFAB_PRIMITIVES_LIBRARY</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => createPrefab('box')} style={{ flex: 1, padding: '5px', background: '#111116', border: '1px solid #1c1c24', color: '#3b82f6', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', borderRadius: '3px', cursor: 'pointer' }}>+ CUBE_MESH</button>
                    <button onClick={() => createPrefab('pyramid')} style={{ flex: 1, padding: '5px', background: '#111116', border: '1px solid #1c1c24', color: '#eab308', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', borderRadius: '3px', cursor: 'pointer' }}>+ CONE_MESH</button>
                </div>
            </div>

            {/* SECCIÓN 4: MATRIZ DE CÁMARAS Y ENTORNO */}
            <div style={{ background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #14141f', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={toggleBlueprints} style={{ width: '100%', padding: '5px', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', background: workspace.showBlueprints ? '#064e3b' : '#4c1d1d', border: 'none', color: '#fff', borderRadius: '3px', cursor: 'pointer' }}>
                    {workspace.showBlueprints ? "SHADED_SOLID_SURFACE" : "WIREFRAME_CAD_VIEW"}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {Object.keys(workspace.cameraViews).map((id) => (
                        <button key={id} onClick={() => setView(id)} style={{ width: '100%', padding: '5px 6px', background: workspace.activeViewId === id ? '#1c0a15' : '#111116', border: 'none', color: workspace.activeViewId === id ? '#ff00aa' : '#64748b', borderRadius: '3px', textAlign: 'left', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer' }}>
                            {workspace.activeViewId === id ? '● ' : '  '}{workspace.cameraViews[id].name}
                        </button>
                    ))}
                </div>
            </div>

            {/* SECCIÓN 5: OUTLINER / GRAFO DE LA ESCENA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #14141f', minHeight: '120px' }}>
                <div style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px' }}>SCENE_GRAPH_OUTLINER</div>
                <div style={{ flex: 1, overflowY: 'auto', background: '#050508', padding: '2px', borderRadius: '3px', border: '1px solid #14141f' }}>
                    {Object.keys(entities).map(id => (
                        <div
                            key={id}
                            onClick={() => selectEntity(id)}
                            style={{
                                padding: '4px 6px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '3px', marginBottom: '1px',
                                background: workspace.selectedEntityId === id ? '#ff00aa15' : 'transparent',
                                color: workspace.selectedEntityId === id ? '#ff00aa' : '#94a3b8',
                                border: `1px solid ${workspace.selectedEntityId === id ? '#ff00aa25' : 'transparent'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}
                        >
                            <span>{entities[id].name}</span>
                            <span
                                onClick={(e) => { e.stopPropagation(); removeEntity(id); if (worker) worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id } }); }}
                                style={{ color: '#475569', padding: '0 4px', borderRadius: '2px' }}
                                onMouseOver={(e) => { e.target.style.color = '#ef4444'; e.target.style.background = '#ef444410'; }}
                                onMouseOut={(e) => { e.target.style.color = '#475569'; e.target.style.background = 'transparent'; }}
                            >
                                [X]
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECCIÓN 6: INSPECTOR MATRIX PARAMÉTRICO */}
            {selectedEntity && (
                <div style={{ background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #ff00aa40', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={selectedEntity.name}
                            onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'name', e.target.value)}
                            style={{ flex: 1, background: '#050508', border: '1px solid #14141f', color: '#fff', fontSize: '10px', fontFamily: 'monospace', padding: '4px', borderRadius: '3px', outline: 'none' }}
                        />
                        <input
                            type="color"
                            value={selectedEntity.color}
                            onChange={(e) => updateEntityTransform(workspace.selectedEntityId, 'color', e.target.value)}
                            style={{ background: 'transparent', border: 'none', width: '22px', height: '20px', cursor: 'pointer', padding: 0 }}
                        />
                    </div>

                    <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>AXIAL_TRANSLATION (X / Y / Z)</div>
                    <div style={{ display: 'flex', gap: '3px' }}>
                        {[0, 1, 2].map(i => (
                            <InspectorField key={i} label={['X', 'Y', 'Z'][i]} value={selectedEntity.position[i]} onChange={(val) => handleTransformChange('position', i, val, selectedEntity.position)} />
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #14141f', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace' }}>HEALTH_POOL:</span>
                            <div style={{ display: 'flex', gap: '2px', width: '100px' }}>
                                <input type="number" value={selectedEntity.gameplay.health} onChange={(e) => handleGameplayChange('health', e.target.value)} style={{ width: '50%', background: '#050508', border: '1px solid #14141f', color: '#00ff66', fontSize: '10px', padding: '2px', fontFamily: 'monospace', textAlign: 'center', borderRadius: '2px', outline: 'none' }} />
                                <input type="number" value={selectedEntity.gameplay.maxHealth} onChange={(e) => handleGameplayChange('maxHealth', e.target.value)} style={{ width: '50%', background: '#050508', border: '1px solid #14141f', color: '#475569', fontSize: '10px', padding: '2px', fontFamily: 'monospace', textAlign: 'center', borderRadius: '2px', outline: 'none' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace' }}>ATTACK_STR:</span>
                            <input type="number" value={selectedEntity.gameplay.damage} onChange={(e) => handleGameplayChange('damage', e.target.value)} style={{ width: '100px', background: '#050508', border: '1px solid #14141f', color: '#ef4444', fontSize: '10px', padding: '2px', fontFamily: 'monospace', textAlign: 'center', borderRadius: '2px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace' }}>TEAM_ALIGN:</span>
                            <select value={selectedEntity.gameplay.faction} onChange={(e) => handleGameplayChange('faction', e.target.value)} style={{ width: '100px', background: '#050508', border: '1px solid #14141f', color: '#eab308', fontSize: '10px', padding: '2px', fontFamily: 'monospace', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}>
                                <option value="player">PLAYER</option>
                                <option value="enemy">ENEMY</option>
                                <option value="neutral">NEUTRAL</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}