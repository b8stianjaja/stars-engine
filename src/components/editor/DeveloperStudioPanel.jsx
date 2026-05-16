import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';

export function DeveloperStudioPanel({ worker }) {
    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const entities = useSystemicStore(state => state.entities);
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);

    const registerEntity = useSystemicStore(state => state.registerEntity);
    const setEntityAsMask = useSystemicStore(state => state.setEntityAsMask);
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const removeEntity = useSystemicStore(state => state.removeEntity);

    // Generador atómico de ID
    const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 6)}`;

    const handleAddBlockout = () => {
        const id = generateId('block');
        const payload = { type: 'box', name: 'Muro Base', scale: [1, 2, 1], color: '#ff9500', position: [0, 1, 0] };
        registerEntity(id, payload);
        if (worker) worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, ...payload, x: 0, y: 1, z: 0, scaleX: 1, scaleY: 2, scaleZ: 1 } });
    };

    const handleAddSprite = () => {
        const id = generateId('actor');
        const payload = { type: 'sprite', name: 'Personaje 2D', scale: [1, 1.5, 1], color: '#34c759', position: [0, 0.75, 0] };
        registerEntity(id, payload);
        if (worker) worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, ...payload, x: 0, y: 0.75, z: 0, scaleX: 1, scaleY: 1.5, scaleZ: 1 } });
    };

    const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', marginTop: '16px' }}>

            {/* CONSTRUCTORES DE MUNDO */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleAddBlockout} style={btnStyle('var(--bg-input)')}>
                    + Cubo Blockout
                </button>
                <button onClick={handleAddSprite} style={btnStyle('var(--accent-subtle)', 'var(--accent)')}>
                    + Sprite 2D
                </button>
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* LISTA DE ENTIDADES (OUTLINER) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Jerarquía de Escena
                </span>

                {entityIds.map(id => {
                    const ent = entities[id];
                    const isSelected = id === selectedEntityId;
                    return (
                        <div
                            key={id}
                            onClick={() => selectEntity(id)}
                            style={{
                                padding: '8px 12px',
                                background: isSelected ? 'var(--accent)' : 'var(--bg-input)',
                                color: isSelected ? '#fff' : 'var(--text-main)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span style={{ fontWeight: isSelected ? '600' : '500' }}>{ent.name}</span>
                            {ent.isGhostMask && <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>MÁSCARA</span>}
                            {ent.type === 'sprite' && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>2D</span>}
                        </div>
                    );
                })}
            </div>

            {/* INSPECTOR (Se muestra solo al seleccionar) */}
            {selectedEntity && (
                <div style={{
                    padding: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{selectedEntity.name}</span>
                        <button
                            onClick={() => { removeEntity(selectedEntityId); if (worker) worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id: selectedEntityId } }); }}
                            style={{ background: 'transparent', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                            Eliminar
                        </button>
                    </div>

                    {selectedEntity.type !== 'sprite' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={selectedEntity.isGhostMask || false}
                                onChange={(e) => setEntityAsMask(selectedEntityId, e.target.checked)}
                                style={{ accentColor: 'var(--accent)' }}
                            />
                            Convertir en Máscara Invisible (Oclusión Z)
                        </label>
                    )}
                </div>
            )}
        </div>
    );
}

const btnStyle = (bg, color = 'var(--text-main)') => ({
    flex: 1, padding: '8px 0', background: bg, border: 'none', borderRadius: 'var(--radius-sm)',
    color: color, fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.1s'
});