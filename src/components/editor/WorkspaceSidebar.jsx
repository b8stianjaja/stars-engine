import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';

export function WorkspaceSidebar({ worker }) {
    const workspace = useSystemicStore(useShallow(state => state.workspace));
    const entities = useSystemicStore(useShallow(state => state.entities));

    const setView = useSystemicStore(state => state.setView);
    const toggleBlueprints = useSystemicStore(state => state.toggleBlueprints);
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const updateEntityTransform = useSystemicStore(state => state.updateEntityTransform);

    const selectedEntity = entities[workspace.selectedEntityId];

    // Transmite los cambios paramétricos de la UI hacia el Web Worker físico
    const handleTransformChange = (field, subIndex, value, currentVector) => {
        if (!workspace.selectedEntityId) return;

        let newVector = [...currentVector];
        newVector[subIndex] = parseFloat(value) || 0;

        // 1. Actualizar el Store visual de React
        updateEntityTransform(workspace.selectedEntityId, field, newVector);

        // 2. Si modificamos posición, sincronizar el array binario del Kernel
        if (field === 'position' && worker) {
            worker.postMessage({
                type: 'UPDATE_PHYSICAL_POS',
                payload: { id: workspace.selectedEntityId, x: newVector[0], y: newVector[1], z: newVector[2] }
            });
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '280px', height: 'calc(100vh - 240px)',
            background: '#09090d', borderRight: '1px solid #1a1a26', padding: '16px',
            boxSizing: 'border-box', color: '#e2e8f0', fontFamily: '"Inter", sans-serif', zIndex: 100,
            overflowY: 'auto'
        }}>
            <h3 style={{ fontSize: '12px', letterSpacing: '1.5px', color: '#6366f1', margin: '0 0 16px 0', fontWeight: 'bold' }}>STARS STUDIO V1.0</h3>

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

            {/* SECCIÓN DE INSPECTOR (DESARROLLADOR / ARTISTA) */}
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
                        <div style={{ fontSize: '11px', color: '#ff00aa', marginBottom: '8px', fontWeight: 'bold' }}>PARAMETRIC_INSPECTOR</div>

                        {/* Control de Posición */}
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

                        {/* Control de Escala */}
                        <div>
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
                    </div>
                )}
            </div>
        </div>
    );
}