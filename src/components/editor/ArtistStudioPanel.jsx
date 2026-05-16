import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

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

    const handleTransformChange = (field, subIndex, value, currentVector) => {
        if (!workspace.selectedEntityId) return;
        let newVector = [...currentVector];
        newVector[subIndex] = parseFloat(value) || 0;
        updateEntityTransform(workspace.selectedEntityId, field, newVector);

        if (worker && field === 'position') {
            worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: workspace.selectedEntityId, x: newVector[0], y: newVector[1], z: newVector[2] } });
        } else if (worker && field === 'scale') {
            worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: workspace.selectedEntityId, scaleX: newVector[0], scaleY: newVector[1], scaleZ: newVector[2] } });
        }
    };

    const handleGameplayChange = (field, value) => {
        if (!workspace.selectedEntityId) return;
        const parsedValue = isNaN(value) ? value : parseFloat(value);
        applyGameplayPatch(workspace.selectedEntityId, { [field]: parsedValue });

        if (worker) {
            worker.postMessage({
                type: 'UPDATE_PHYSICAL_POS',
                payload: { id: workspace.selectedEntityId, gameplay: { [field]: parsedValue } }
            });
        }
    };

    const createPrimitiveEntity = (type) => {
        if (freeIndices.length === 0) return;
        const nextIndex = freeIndices[freeIndices.length - 1];
        const id = `dynamic_node_${Date.now()}`;

        const defaultData = {
            index: nextIndex,
            name: `Mesh_${type.toUpperCase()}_${nextIndex}`,
            type: type,
            scale: [1, 1, 1],
            color: '#2563eb',
            position: [0, 0.5, 0],
            gameplay: { health: 100, maxHealth: 100, damage: 15, faction: 'enemy', inventory: [] }
        };

        registerEntity(id, defaultData, 'hash_asset_default');

        if (worker) {
            worker.postMessage({
                type: 'ADD_ENTITY_LOGIC',
                payload: { id, index: nextIndex, x: 0, y: 0.5, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, gameplay: defaultData.gameplay }
            });
        }
        selectEntity(id);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* SERIALIZADOR */}
            <div style={{ background: '#0d0d12', padding: '10px', borderRadius: '6px', border: '1px solid #161622' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={async () => await TauriBridge.saveScene({ entities, visuals })} style={{ flex: 1, padding: '6px 0', background: '#1c0a15', border: '1px solid #3c122c', color: '#ff00aa', fontSize: '10px', fontFamily: '"Fira Code", monospace', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>SAVE_JSON</button>
                    <button onClick={async () => { const d = await TauriBridge.loadScene(); if (d) { loadSceneState(d); if (worker) worker.postMessage({ type: 'LOAD_SCENE_LOGIC', payload: Object.values(d.entities) }); } }} style={{ flex: 1, padding: '6px 0', background: '#0d0d12', border: '1px solid #222230', color: '#94a3b8', fontSize: '10px', fontFamily: '"Fira Code", monospace', borderRadius: '4px', cursor: 'pointer' }}>LOAD_JSON</button>
                </div>
            </div>

            {/* MANIPULACIÓN */}
            <div style={{ background: '#0d0d12', padding: '10px', borderRadius: '6px', border: '1px solid #161622' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    <button onClick={() => setTransformMode('translate')} style={{ flex: 1, padding: '5px 0', fontSize: '10px', background: workspace.transformMode === 'translate' ? '#ff00aa' : '#12121a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>MOVE</button>
                    <button onClick={() => setTransformMode('scale')} style={{ flex: 1, padding: '5px 0', fontSize: '10px', background: workspace.transformMode === 'scale' ? '#ff00aa' : '#12121a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>SCALE</button>
                </div>
                <select value={workspace.snapValue} onChange={(e) => setSnapValue(parseFloat(e.target.value))} style={{ width: '100%', background: '#050508', border: '1px solid #161622', color: '#ff00aa', fontSize: '10px', padding: '4px', borderRadius: '3px', fontFamily: 'monospace', outline: 'none' }}>
                    <option value="0">FREE_SNAP</option>
                    <option value="0.5">0.5m_GRID</option>
                    <option value="1.0">1.0m_GRID</option>
                </select>
            </div>

            {/* INSTANCIACIÓN */}
            <div style={{ background: '#0d0d12', padding: '10px', borderRadius: '6px', border: '1px solid #161622' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => createPrimitiveEntity('box')} style={{ flex: 1, padding: '5px 0', background: '#12121a', border: '1px solid #222', color: '#fff', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' }}>+ BOX</button>
                    <button onClick={() => createPrimitiveEntity('pyramid')} style={{ flex: 1, padding: '5px 0', background: '#12121a', border: '1px solid #222', color: '#fff', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' }}>+ PYRAMID</button>
                </div>
            </div>

            {/* ÁNGULOS */}
            <div style={{ background: '#0d0d12', padding: '10px', borderRadius: '6px', border: '1px solid #161622' }}>
                <button onClick={toggleBlueprints} style={{ width: '100%', padding: '5px 0', marginBottom: '6px', fontSize: '10px', background: workspace.showBlueprints ? '#064e3b' : '#4c1d1d', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                    {workspace.showBlueprints ? "SHADED_SOLID" : "WIREFRAME"}
                </button>
                {Object.keys(workspace.cameraViews).map((id) => (
                    <button key={id} onClick={() => setView(id)} style={{ display: 'block', width: '100%', padding: '5px 8px', marginBottom: '3px', background: workspace.activeViewId === id ? '#1c0a15' : '#12121a', border: 'none', color: '#94a3b8', borderRadius: '4px', textAlign: 'left', fontSize: '10px', cursor: 'pointer', fontFamily: 'monospace' }}>
                        &gt; {workspace.cameraViews[id].name.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* JERARQUÍA */}
            <div style={{ background: '#0d0d12', padding: '6px', borderRadius: '6px', border: '1px solid #161622', maxHeight: '90px', overflowY: 'auto' }}>
                {Object.keys(entities).map(id => (
                    <div key={id} onClick={() => selectEntity(id)} style={{ padding: '4px 6px', fontSize: '10px', cursor: 'pointer', borderRadius: '2px', background: workspace.selectedEntityId === id ? '#ff00aa15' : 'transparent', color: workspace.selectedEntityId === id ? '#ff00aa' : '#94a3b8' }}>
                        {entities[id].name}
                    </div>
                ))}
            </div>

            {/* INSPECTOR INTEGRADO CON FRAMEWORK DE GAMEPLAY */}
            {selectedEntity && (
                <div style={{ background: '#0d0d12', padding: '10px', borderRadius: '6px', border: '1px solid #ff00aa60' }}>
                    <div style={{ fontSize: '9px', color: '#ff00aa', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'monospace' }}>COMPONENTS_INSPECTOR</div>

                    {/* Campos de Transformación del Artista */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        {[0, 1, 2].map(i => (
                            <input key={i} type="number" step="0.1" value={selectedEntity.position[i]} onChange={(e) => handleTransformChange('position', i, e.target.value, selectedEntity.position)} style={{ width: '100%', background: '#050508', border: '1px solid #161622', color: '#fff', fontSize: '10px', padding: '4px', borderRadius: '3px', fontFamily: 'monospace' }} />
                        ))}
                    </div>

                    {/* NUEVOS CAMPOS DEL FRAMEWORK DE JUEGO */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #222', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '9px', color: '#64748b' }}>HP / MAX_HP:</span>
                            <div style={{ display: 'flex', gap: '2px', width: '100px' }}>
                                <input type="number" value={selectedEntity.gameplay.health} onChange={(e) => handleGameplayChange('health', e.target.value)} style={{ width: '50%', background: '#050508', border: '1px solid #161622', color: '#00ff66', fontSize: '10px', padding: '2px', fontFamily: 'monospace', textAlign: 'center' }} />
                                <input type="number" value={selectedEntity.gameplay.maxHealth} onChange={(e) => handleGameplayChange('maxHealth', e.target.value)} style={{ width: '50%', background: '#050508', border: '1px solid #161622', color: '#64748b', fontSize: '10px', padding: '2px', fontFamily: 'monospace', textAlign: 'center' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '9px', color: '#64748b' }}>ATK_DAMAGE:</span>
                            <input type="number" value={selectedEntity.gameplay.damage} onChange={(e) => handleGameplayChange('damage', e.target.value)} style={{ width: '100px', background: '#050508', border: '1px solid #161622', color: '#ef4444', fontSize: '10px', padding: '2px', fontFamily: 'monospace', textAlign: 'center' }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '9px', color: '#64748b' }}>TEAM_FACTION:</span>
                            <select value={selectedEntity.gameplay.faction} onChange={(e) => handleGameplayChange('faction', e.target.value)} style={{ width: '100px', background: '#050508', border: '1px solid #161622', color: '#eab308', fontSize: '10px', padding: '2px', fontFamily: 'monospace' }}>
                                <option value="player">PLAYER</option>
                                <option value="enemy">ENEMY</option>
                                <option value="neutral">NEUTRAL</option>
                            </select>
                        </div>

                        <div style={{ background: '#050508', padding: '4px', borderRadius: '4px', border: '1px solid #161622', fontSize: '9px', fontFamily: 'monospace' }}>
                            <span style={{ color: '#475569' }}>INVENTORY_SLOTS:</span>
                            <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                                {selectedEntity.gameplay.inventory.length > 0 ? selectedEntity.gameplay.inventory.join(', ') : 'EMPTY_INVENTORY'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}