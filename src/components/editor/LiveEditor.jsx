import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useSystemicStore } from '../../core/engine.store';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

export function LiveEditor({ worker }) {
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const entities = useSystemicStore(state => state.entities);
    const updateEntityScript = useSystemicStore(state => state.updateEntityScript);

    const activeEntity = entities[selectedEntityId];
    const [localCode, setLocalCode] = useState('');
    const [scriptStatus, setScriptStatus] = useState({ status: 'IDLE', error: null });

    useEffect(() => {
        if (activeEntity) {
            setLocalCode(activeEntity.scriptCode);
            setScriptStatus({ status: 'LOADED', error: null });
        } else {
            setLocalCode('// Selecciona un nodo de escena en el Inspector para programar su comportamiento...');
            setScriptStatus({ status: 'IDLE', error: null });
        }
    }, [selectedEntityId, activeEntity]);

    // Escuchar el canal de telemetría de scripts del Kernel
    useEffect(() => {
        if (!worker) return;

        const handleKernelStatus = (e) => {
            if (e.data.type === 'SCRIPT_STATUS' && e.data.payload.id === selectedEntityId) {
                setScriptStatus({
                    status: e.data.payload.status,
                    error: e.data.payload.error
                });
            }
        };

        worker.addEventListener('message', handleKernelStatus);
        return () => worker.removeEventListener('message', handleKernelStatus);
    }, [worker, selectedEntityId]);

    const handleCompileAndInject = async (value) => {
        if (!selectedEntityId) return;

        setScriptStatus({ status: 'COMPILING', error: null });

        // 1. Asentar inmutablemente en el Store Paramétrico
        updateEntityScript(selectedEntityId, value);

        // 2. Despachar de forma atómica al Web Worker Kernel
        if (worker) {
            worker.postMessage({
                type: 'INJECT_SCRIPT',
                payload: { id: selectedEntityId, code: value }
            });
        }

        // 3. Persistencia asíncrona segura en disco
        try {
            await TauriBridge.saveScript(`${selectedEntityId}.js`, value);
        } catch (e) {
            // Aislamiento preventivo de IO de fallos locales
        }
    };

    // Estilos de estado dinámico
    const getStatusColor = () => {
        if (scriptStatus.status === 'RUNNING') return '#00ff66';
        if (scriptStatus.status === 'COMPILE_ERROR' || scriptStatus.status === 'RUNTIME_ERROR') return '#ef4444';
        if (scriptStatus.status === 'COMPILING') return '#eab308';
        return '#64748b';
    };

    return (
        <div style={{ height: '240px', borderTop: '1px solid #1a1a24', position: 'absolute', bottom: 0, width: '100%', zIndex: 10, display: 'flex', flexDirection: 'column', background: '#09090c' }}>
            {/* BARRA DE HERRAMIENTAS Y CONTROL DE COMPILACIÓN EN TIEMPO REAL */}
            <div style={{
                height: '32px', background: '#111116', borderBottom: '1px solid #1a1a24',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: '"Fira Code", monospace', fontSize: '11px', color: activeEntity ? '#ff00aa' : '#64748b', fontWeight: 'bold' }}>
                        TARGET: {selectedEntityId ? selectedEntityId.toUpperCase() : 'NONE'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#050507', padding: '2px 8px', borderRadius: '4px', border: '1px solid #222' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor() }} />
                        <span style={{ fontFamily: '"Fira Code", monospace', fontSize: '9px', color: getStatusColor(), fontWeight: 'bold' }}>
                            {scriptStatus.status}
                        </span>
                    </div>
                    {scriptStatus.error && (
                        <span style={{ fontFamily: '"Fira Code", monospace', fontSize: '10px', color: '#ef4444', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ⚠ {scriptStatus.error}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => handleCompileAndInject(localCode)}
                    disabled={!selectedEntityId}
                    style={{
                        padding: '4px 12px', background: selectedEntityId ? '#6366f1' : '#1e1e24',
                        border: 'none', color: selectedEntityId ? '#fff' : '#475569', fontSize: '11px',
                        fontFamily: '"Inter", sans-serif', fontWeight: 'bold', borderRadius: '4px',
                        cursor: selectedEntityId ? 'pointer' : 'not-allowed', transition: 'background 0.2s'
                    }}
                >
                    ⚡ INYECTAR COMPORTAMIENTO (Ctrl+S)
                </button>
            </div>

            {/* EDITOR MONACO INTEGRADO */}
            <div style={{ flex: 1, position: 'relative' }}>
                <Editor
                    height="100%" defaultLanguage="javascript" theme="vs-dark"
                    value={localCode}
                    onChange={(val) => setLocalCode(val || '')}
                    options={{
                        minimap: { enabled: false }, fontSize: 12, fontFamily: '"Fira Code", monospace',
                        readOnly: !selectedEntityId, domReadOnly: !selectedEntityId
                    }}
                    onMount={(editor, monaco) => {
                        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                            handleCompileAndInject(editor.getValue());
                        });
                    }}
                />
            </div>
        </div>
    );
}