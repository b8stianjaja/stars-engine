import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';

function SectionHeader({ title }) {
    return (
        <div style={{
            fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)',
            letterSpacing: '0.3px', textTransform: 'uppercase', marginTop: '10px', marginBottom: '6px'
        }}>
            {title}
        </div>
    );
}

export function DeveloperStudioPanel({ worker }) {
    const entities = useSystemicStore(useShallow(state => state.entities));
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const selectEntity = useSystemicStore(state => state.selectEntity);

    // Filtrar entidades que tienen scripts activos o configuraciones lógicas avanzadas
    const scriptedEntities = Object.entries(entities).filter(([_, data]) => data.scriptCode && data.scriptCode.trim() !== '');
    const regularEntities = Object.entries(entities).filter(([_, data]) => !data.scriptCode || data.scriptCode.trim() === '');

    const EntityRow = ({ id, data, hasScript }) => {
        const isActive = selectedEntityId === id;
        return (
            <div
                onClick={() => selectEntity(id)}
                style={{
                    padding: '8px 10px',
                    background: isActive ? 'var(--accent-subtle)' : 'var(--bg-input)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hasScript ? '#0071e3' : 'var(--border-strong)' }} />
                    <span style={{ fontSize: '12px', fontWeight: isActive ? '600' : '500', color: isActive ? 'var(--accent)' : 'var(--text-main)' }}>
                        {data.name}
                    </span>
                </div>
                {hasScript && (
                    <span style={{ fontSize: '10px', color: 'var(--accent)', background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '8px' }}>
                        JS Activo
                    </span>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>

            {/* MONITOR DE ACTIVIDAD DEL KERNEL */}
            <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>Monitor del Motor</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#34c759', fontWeight: '600' }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#34c759', animation: 'pulse 2s infinite' }} />
                        60 Hz
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Memoria Compartida</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>128 KB</span>
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Nodos Totales</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{Object.keys(entities).length}</span>
                    </div>
                </div>

                <button style={{ width: '100%', padding: '6px', marginTop: '4px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '500', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s' }}>
                    Reiniciar Hilo Físico
                </button>
            </div>

            {/* GESTOR DE ENTIDADES LÓGICAS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                <div style={{ overflowY: 'auto', paddingRight: '4px' }}>
                    {scriptedEntities.length > 0 && (
                        <>
                            <SectionHeader title="Nodos con Lógica Inyectada" />
                            {scriptedEntities.map(([id, data]) => (
                                <EntityRow key={id} id={id} data={data} hasScript={true} />
                            ))}
                        </>
                    )}

                    <SectionHeader title="Nodos Estáticos" />
                    {regularEntities.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>No hay nodos estáticos.</div>
                    ) : (
                        regularEntities.map(([id, data]) => (
                            <EntityRow key={id} id={id} data={data} hasScript={false} />
                        ))
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}