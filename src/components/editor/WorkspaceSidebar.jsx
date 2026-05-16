import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';

export function WorkspaceSidebar({ worker }) {
    const workspace = useSystemicStore(useShallow(state => state.workspace));
    const entities = useSystemicStore(useShallow(state => state.entities));

    const setView = useSystemicStore(state => state.setView);
    const toggleBlueprints = useSystemicStore(state => state.toggleBlueprints);
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const updateEntityTransform = useSystemicStore(state => state.updateEntityTransform);

    const registerEntity = useSystemicStore(state => state.registerEntity);
    const removeEntity = useSystemicStore(state => state.removeEntity);

    // Nuevas acciones de control del Gizmo
    const setTransformMode = useSystemicStore(state => state.setTransformMode);
    const setSnapValue = useSystemicStore(state => state.setSnapValue);

    const selectedEntity = entities[workspace.selectedEntityId];

    const handleTransformChange = (field, subIndex, value, currentVector) => {
        if (!workspace.selectedEntityId) return;

        let newVector = [...currentVector];
        newVector[subIndex] = parseFloat(value) || 0;

        updateEntityTransform(workspace.selectedEntityId, field, newVector);

        if (field === 'position' && worker) {
            worker.postMessage({
                type: 'UPDATE_PHYSICAL_POS',
                payload: { id: workspace.selectedEntityId, x: newVector[0], y: newVector[1], z: newVector[2] }
            });
        }
    };

    const handlePropertyChange = (field, value) => {
        if (!workspace.selectedEntityId) return;
        updateEntityTransform(workspace.selectedEntityId, field, value);
    };

    const createPrimitiveEntity = (type) => {
        const id = `dynamic_node_${Date.now()}`;
        const allocatedIndices = Object.values(entities).map(e => e.index);
        const nextIndex = allocatedIndices.length > 0 ? Math.max(...allocatedIndices) + 1 : 0;

        const defaultData = {
            index: nextIndex,
            name: `Nodo_${type.toUpperCase()}_${nextIndex}`,
            type: type,
            scale: [1, 1, 1],
            color: type === 'pyramid' ? '#e11d48' : '#2563eb',
            position: [0, 0.5, 0],
            scriptCode: '// Código lógico en caliente...\n'
        };

        registerEntity(id, defaultData, 'hash_asset_default');

        if (worker) {
            worker.postMessage({
                type: 'ADD_ENTITY_LOGIC',
                payload: { id, index: nextIndex, x: 0, y: 0.5, z: 0 }
            });
        }
        selectEntity(id);
    };

    const destroySelectedEntity = () => {
        if (!workspace.selectedEntityId) return;
        const targetId = workspace.selectedEntityId;

        if (worker) {
            worker.postMessage({
                type: 'REMOVE_ENTITY_LOGIC',
                payload: { id: targetId }
            });
        }
        removeEntity(targetId);
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '280px', height: 'calc(100vh - 240px)',
            background: '#09090d', borderRight: '1px solid #1a1a26', padding: '16px',
            boxSizing: 'border-box', color: '#e2e8f0', fontFamily: '"Inter", sans-serif', zIndex: 100,
            overflowY: 'auto'
        }}>
            <h3 style={{ fontSize: '12px', letterSpacing: '1.5px', color: '#6366f1', margin: '0 0 16px 0', fontWeight: 'bold' }}>STARS STUDIO V1.0</h3>

            {/* CONTROL DE GIZMOS COMPLETAMENTE FUNCIONAL (CONMUTADORES) */}
            <div style={{ marginBottom: '18px' }}>
                <h4 style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Herramientas de Manipulación</h4>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    <button
                        onClick={() => setTransformMode('translate')}
                        style={{
                            flex: 1, padding: '6px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #222',
                            background: workspace.transformMode === 'translate' ? '#6366f1' : '#111116', color: '#fff', fontWeight: 'bold'
                        }}
                    >
                        Traducción (W)
                    </button>
                    <button
                        onClick={() => setTransformMode('scale')}
                        style={{
                            flex: 1, padding: '6px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #222',
                            background: workspace.transformMode === 'scale' ? '#6366f1' : '#111116', color: '#fff', fontWeight: 'bold'
                        }}
                    >
                        Escala (R)
                    </button>
                </div>

                {/* SELECTOR DE GRID SNAPPING */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#050507', padding: '4px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>Imán Snapping:</span>
                    <select
                        value={workspace.snapValue}
                        onChange={(e) => setSnapValue(parseFloat(e.target.value))}
                        style={{ background: '#111116', border: '1px solid #333', color: '#00ff66', fontSize: '10px', padding: '2px', borderRadius: '2px', fontFamily: 'monospace' }}
                    >
                        <option value="0">Desactivado (Libre)</option>
                        <option value="0.1">0.1m Grid</option>
                        <option value="0.5">0.5m Bloques</option>
                        <option value="1.0">1.0m Estricto</option>
                    </select>
                </div>
            </div>

            {/* SECCIÓN DE VISTAS (ARTISTA) */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Viewports de Trabajo</h4>
                {Object.keys(workspace.cameraViews).map((id) => (
                    <button
                        key={id}
                        onClick={() => setView(id)}
                        style={{
                            display: 'block', width: '100%', padding: '6px 10px', marginBottom: '4px',
                            background: workspace.activeViewId === id ? '#1e1b4b' : '#111116',
                            border: `1px solid ${workspace.activeViewId === id ? '#6366f1' : '#1a1a22'}`,
                            color: workspace.activeViewId === id ? '#c7d2fe' : '#94a3b8',
                            borderRadius: '4px', textAlign: 'left', fontSize: '11px', cursor: 'pointer'
                        }}
                    >
                        {workspace.cameraViews[id].name}
                    </button>
                ))}
            </div>

            {/* HERRAMIENTAS DE GREYBOXING DIRECTO */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Instanciación Dinámica</h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => createPrimitiveEntity('box')} style={{ flex: 1, padding: '6px', background: '#222230', border: '1px solid #333', color: '#fff', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' }}>+ Cubo static</button>
                    <button onClick={() => createPrimitiveEntity('pyramid')} style={{ flex: 1, padding: '6px', background: '#222230', border: '1px solid #333', color: '#fff', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' }}>+ Pirámide</button>
                </div>
            </div>

            {/* SECCIÓN DE JERARQUÍA DE ESCENA */}
            <div>
                <h4 style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Jerarquía de Escena</h4>
                <button
                    onClick={toggleBlueprints}
                    style={{
                        width: '100%', padding: '6px', marginBottom: '10px', fontSize: '10px',
                        background: workspace.showBlueprints ? '#064e3b' : '#4c1d1d',
                        border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
                    }}
                >
                    {workspace.showBlueprints ? "👁️ MODO VISUAL: COMPLETO" : "🩻 MODO VISUAL: WIREFRAME"}
                </button>

                <div style={{ maxHeight: '110px', overflowY: 'auto', background: '#050507', padding: '4px', borderRadius: '4px', marginBottom: '16px' }}>
                    {Object.keys(entities).map(id => (
                        <div
                            key={id}
                            onClick={() => selectEntity(id)}
                            style={{
                                padding: '5px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '2px', margin: '2px 0',
                                background: workspace.selectedEntityId === id ? '#ff00aa18' : 'transparent',
                                color: workspace.selectedEntityId === id ? '#ff00aa' : '#aaa',
                                borderLeft: `2px solid ${workspace.selectedEntityId === id ? '#ff00aa' : 'transparent'}`
                            }}
                        >
                            {entities[id].name}
                        </div>
                    ))}
                </div>

                {/* PANEL PARAMÉTRICO COMPLETO */}
                {selectedEntity && (
                    <div style={{ background: '#111116', padding: '10px', borderRadius: '4px', border: '1px solid #1a1a24' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#ff00aa', fontWeight: 'bold' }}>PARAMETRIC_INSPECTOR</div>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Identificador Visual</label>
                            <input
                                type="text"
                                value={selectedEntity.name}
                                onChange={(e) => handlePropertyChange('name', e.target.value)}
                                style={{ width: '100%', background: '#050507', border: '1px solid #222', color: '#fff', fontSize: '10px', padding: '4px', borderRadius: '2px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '8px', display: 'flex', gap: '4px', flexDirection: 'column' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>Malla Estructural</label>
                            <select
                                value={selectedEntity.type}
                                onChange={(e) => handlePropertyChange('type', e.target.value)}
                                style={{ width: '100%', background: '#050507', border: '1px solid #222', color: '#fff', fontSize: '10px', padding: '4px', borderRadius: '2px' }}
                            >
                                <option value="box">Cubo Estructural</option>
                                <option value="pyramid">Pirámide de Composición</option>
                            </select>
                        </div>

                        {/* Control de Posición Manual */}
                        <div style={{ marginBottom: '6px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Posición (X, Y, Z)</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[0, 1, 2].map(i => (
                                    <input
                                        key={i} type="number" step="0.1"
                                        value={selectedEntity.position[i]}
                                        onChange={(e) => handleTransformChange('position', i, e.target.value, selectedEntity.position)}
                                        style={{ width: '100%', background: '#050507', border: '1px solid #222', color: '#fff', fontSize: '10px', padding: '4px', borderRadius: '2px' }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Control de Escala Manual */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Escala (W, H, D)</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[0, 1, 2].map(i => (
                                    <input
                                        key={i} type="number" step="0.1"
                                        value={selectedEntity.scale[i]}
                                        onChange={(e) => handleTransformChange('scale', i, e.target.value, selectedEntity.scale)}
                                        style={{ width: '100%', background: '#050507', border: '1px solid #222', color: '#fff', fontSize: '10px', padding: '4px', borderRadius: '2px' }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Material (Albedo Color)</label>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={selectedEntity.color}
                                    onChange={(e) => handlePropertyChange('color', e.target.value)}
                                    style={{ background: 'none', border: 'none', padding: 0, width: '24px', height: '24px', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#aaa' }}>{selectedEntity.color.toUpperCase()}</span>
                            </div>
                        </div>

                        <button
                            onClick={destroySelectedEntity}
                            style={{ width: '100%', padding: '6px', background: '#7f1d1d', border: '1px solid #991b1b', color: '#fca5a5', fontSize: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            🛑 ELIMINAR NODO FÍSICO
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}