import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { TelemetryHUD } from '../debug/TelemetryHUD';

export function DeveloperStudioPanel({ worker }) {
    const entities = useSystemicStore(useShallow(state => state.entities));
    const selectedEntityId = useSystemicStore(useShallow(state => state.workspace.selectedEntityId));
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const updateEntityScript = useSystemicStore(state => state.updateEntityScript);

    const activeNode = entities[selectedEntityId];

    const injectPipelineRoutine = (type) => {
        if (!selectedEntityId) return;

        let script = '';
        if (type === 'ORBIT') {
            script = `// PIPELINE: MOVIMIENTO ANGULAR CONTINUO EN XZ\nconst speed = 2.0; const radius = 5.0;\nent.x = ent.baseX + api.math.cos(api.time * speed) * radius;\nent.z = ent.baseZ + api.math.sin(api.time * speed) * radius;\n`;
        } else if (type === 'WOBBLE') {
            script = `// PIPELINE: FRECUENCIA VERTICAL SINOIDAL\nconst frequency = 4.5; const amplitude = 0.6;\nent.y = ent.baseY + api.math.sin(api.time * frequency) * amplitude;\n`;
        } else if (type === 'COMBAT') {
            script = `// PIPELINE: SISTEMA DE RANGO DE ATAQUE\nif (ent.collidingWith.length > 0) {\n    const target = api.getEntity(ent.collidingWith[0]);\n    if (target && target.faction !== ent.faction) {\n        // Rutina táctica hostil síncrona\n    }\n}\n`;
        }

        updateEntityScript(selectedEntityId, script);
        if (worker) {
            worker.postMessage({ type: 'INJECT_SCRIPT', payload: { id: selectedEntityId, code: script } });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>

            {/* COMPONENTE 1: MONITOR DE TELEMETRÍA ULTRA-COMPACTO */}
            <div style={{ background: '#09090f', borderRadius: '4px', border: '1px solid #14141f', overflow: 'hidden' }}>
                <div style={{ fontSize: '9px', color: '#475569', fontWeight: 'bold', padding: '6px 8px 0 8px', fontFamily: 'monospace' }}>CORE_SIMULATION_TELEMETRY</div>
                <TelemetryHUD worker={worker} />
            </div>

            {/* COMPONENTE 2: REGISTRO DE RUTINAS COMPILADAS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #14141f', minHeight: '120px' }}>
                <div style={{ fontSize: '9px', color: '#475569', fontWeight: 'bold', marginBottom: '4px', fontFamily: 'monospace' }}>PIPELINE_BEHAVIOR_REGISTRY</div>
                <div style={{ flex: 1, overflowY: 'auto', background: '#050508', padding: '2px', borderRadius: '3px', border: '1px solid #14141f' }}>
                    {Object.keys(entities).map(id => {
                        const hasScript = entities[id].scriptCode && entities[id].scriptCode.trim() !== '// COMPONENT_ROUTINE_SCRIPT\n' && entities[id].scriptCode.trim() !== '';
                        const isSelected = selectedEntityId === id;

                        return (
                            <div
                                key={id}
                                onClick={() => selectEntity(id)}
                                style={{
                                    padding: '5px 6px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px', marginBottom: '2px',
                                    background: isSelected ? '#6366f112' : 'transparent',
                                    color: isSelected ? '#6366f1' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    border: `1px solid ${isSelected ? '#6366f130' : 'transparent'}`
                                }}
                            >
                                <span style={{ fontFamily: '"Fira Code", monospace' }}>{id}</span>
                                <span style={{ fontSize: '8px', color: hasScript ? '#10b981' : '#475569', background: hasScript ? '#10b98110' : '#111116', padding: '1px 5px', borderRadius: '2px', border: `1px solid ${hasScript ? '#10b98125' : '#1c1c24'}` }}>
                                    {hasScript ? "COMPILED_JS" : "STATIC"}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* COMPONENTE 3: INYECTOR DE SISTEMAS PRE-COMPILADOS */}
            {activeNode && (
                <div style={{ background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #6366f140', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '9px', color: '#6366f1', fontWeight: 'bold', fontFamily: 'monospace' }}>QUICK_ROUTINE_BOILERPLATE_INJECTOR</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <button onClick={() => injectPipelineRoutine('ORBIT')} style={{ padding: '5px', background: '#111116', border: '1px solid #1c1c24', color: '#fff', fontSize: '9px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '3px' }}>+ ORBIT_LOOP</button>
                        <button onClick={() => injectPipelineRoutine('WOBBLE')} style={{ padding: '5px', background: '#111116', border: '1px solid #1c1c24', color: '#fff', fontSize: '9px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '3px' }}>+ WOBBLE_Y</button>
                        <button onClick={() => injectPipelineRoutine('COMBAT')} style={{ padding: '5px', background: '#111116', border: '1px solid #1c1c24', color: '#fff', fontSize: '9px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '3px', gridColumn: 'span 2' }}>+ COMBAT_RANGE_SCANNER</button>
                    </div>
                </div>
            )}

            {/* COMPONENTE 4: CONTEXTO DE DIRECCIONAMIENTO BINARIO (SAB SCHEMA 2.0) */}
            {activeNode && (
                <div style={{ background: '#09090f', padding: '8px', borderRadius: '4px', border: '1px solid #6366f140', fontFamily: '"Fira Code", monospace', fontSize: '11px' }}>
                    <div style={{ color: '#6366f1', fontWeight: 'bold', marginBottom: '4px', fontSize: '9px' }}>SHARED_ARRAY_BUFFER_POINTER</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#050508', padding: '6px', borderRadius: '3px', border: '1px solid #1c1c24' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#475569' }}>BYTE_OFFSET:</span> <span style={{ color: '#10b981', fontWeight: 'bold' }}>0x{(activeNode.index * 16 * 4).toString(16).toUpperCase()} byte</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#475569' }}>STRIDE_INDEX:</span> <span style={{ color: '#eab308', fontWeight: 'bold' }}>{activeNode.index} / 2000</span></div>
                    </div>
                </div>
            )}
        </div>
    );
}