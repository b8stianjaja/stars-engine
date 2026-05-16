import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { TelemetryHUD } from '../debug/TelemetryHUD';

export function DeveloperStudioPanel({ worker }) {
    const entities = useSystemicStore(useShallow(state => state.entities));
    const selectedEntityId = useSystemicStore(useShallow(state => state.workspace.selectedEntityId));
    const selectEntity = useSystemicStore(state => state.selectEntity);

    const activeNode = entities[selectedEntityId];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>

            {/* COMPONENTE 1: MONITOR DE TELEMETRÍA DEL WORKER */}
            <div style={{ background: '#0d0d12', borderRadius: '6px', border: '1px solid #161622', padding: '2px', overflow: 'hidden' }}>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold', padding: '8px 8px 2px 8px', letterSpacing: '0.5px' }}>KERNEL_PERFORMANCE</div>
                <TelemetryHUD worker={worker} />
            </div>

            {/* COMPONENTE 2: CONTROLADOR DE SCRIPTS INYECTADOS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d0d12', padding: '10px', borderRadius: '6px', border: '1px solid #161622' }}>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.5px' }}>BEHAVIOR_ROUTINES_REGISTRY</div>

                <div style={{ flex: 1, maxHeight: '200px', overflowY: 'auto', background: '#050508', padding: '4px', borderRadius: '4px', border: '1px solid #161622' }}>
                    {Object.keys(entities).map(id => {
                        const hasScript = entities[id].scriptCode &&
                            entities[id].scriptCode.trim() !== '// Código lógico de la entidad...\n' &&
                            entities[id].scriptCode.trim() !== '';
                        const isSelected = selectedEntityId === id;

                        return (
                            <div
                                key={id}
                                onClick={() => selectEntity(id)}
                                style={{
                                    padding: '6px 8px', fontSize: '10px', cursor: 'pointer', borderRadius: '4px', margin: '3px 0',
                                    background: isSelected ? '#6366f115' : 'transparent',
                                    color: isSelected ? '#6366f1' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    border: `1px solid ${isSelected ? '#6366f140' : 'transparent'}`,
                                    transition: 'all 0.1s ease-in-out'
                                }}
                            >
                                <span style={{ fontFamily: '"Fira Code", monospace', fontWeight: isSelected ? 'bold' : 'normal' }}>
                                    {id.substring(0, 18)}
                                </span>
                                <span style={{
                                    fontSize: '8px',
                                    color: hasScript ? '#10b981' : '#475569',
                                    background: hasScript ? '#10b98110' : '#222',
                                    padding: '2px 6px', borderRadius: '3px',
                                    fontFamily: '"Fira Code", monospace', fontWeight: 'bold'
                                }}>
                                    {hasScript ? "COMPILED_JS" : "NO_LOGIC"}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* COMPONENTE 3: CONTEXTO DE DIRECCIONAMIENTO SAB */}
            {activeNode && (
                <div style={{ background: '#0d0d12', padding: '10px', borderRadius: '6px', border: '1px solid #6366f150', fontFamily: '"Fira Code", monospace', fontSize: '10px', boxShadow: '0 4px 20px rgba(99,102,241,0.05)' }}>
                    <div style={{ color: '#6366f1', fontWeight: 'bold', marginBottom: '8px', fontSize: '9px' }}>SHARED_MEMORY_POINTER</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#050508', padding: '6px', borderRadius: '4px', border: '1px solid #161622' }}>
                        <div style={{ color: '#64748b' }}>NODE_ID: <span style={{ color: '#fff', fontWeight: 'bold' }}>{activeNode.id}</span></div>
                        <div style={{ color: '#64748b' }}>MEM_OFFSET: <span style={{ color: '#10b981', fontWeight: 'bold' }}>0x{(activeNode.index * 3 * 4).toString(16).toUpperCase()}</span></div>
                        <div style={{ color: '#64748b' }}>ARRAY_INDEX: <span style={{ color: '#eab308', fontWeight: 'bold' }}>{activeNode.index}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
}