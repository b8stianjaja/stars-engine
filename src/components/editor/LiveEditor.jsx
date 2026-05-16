import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useSystemicStore } from '../../core/engine.store';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

export function LiveEditor({ worker }) {
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);

    // MUTACIÓN ARQUITECTÓNICA: Suscripción quirúrgica a una sola entidad.
    const activeEntity = useSystemicStore(state => state.entities[selectedEntityId]);
    const updateEntityScript = useSystemicStore(state => state.updateEntityScript);

    const [localCode, setLocalCode] = useState('');
    const [scriptStatus, setScriptStatus] = useState({ status: 'IDLE', error: null });
    const editorRef = useRef(null);

    // Sincronización inmutable del código al cambiar de selección
    useEffect(() => {
        if (activeEntity) {
            setLocalCode(activeEntity.scriptCode || '// Define el comportamiento (Update, Start) para este nodo...\n');
            setScriptStatus({ status: activeEntity.scriptCode ? 'LOADED' : 'IDLE', error: null });
        } else {
            setLocalCode('/* \n  Ningún componente lógico seleccionado.\n  Selecciona un nodo en el panel lateral para inspeccionar o inyectar código.\n*/');
            setScriptStatus({ status: 'IDLE', error: null });
        }
    }, [selectedEntityId, activeEntity?.scriptCode]);

    // Telemetría de Kernel aislada por ID
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

    const handleCompileAndInject = async () => {
        if (!selectedEntityId || !localCode.trim()) return;

        setScriptStatus({ status: 'COMPILING', error: null });

        // 1. Mutación Atómica en Almacén
        updateEntityScript(selectedEntityId, localCode);

        // 2. Despacho al Web Worker (Kernel)
        if (worker) {
            worker.postMessage({
                type: 'INJECT_SCRIPT',
                payload: { id: selectedEntityId, code: localCode }
            });
        }

        // 3. Persistencia asíncrona silenciosa (Tauri IO)
        try {
            await TauriBridge.saveScript(`${selectedEntityId}.js`, localCode);
        } catch (e) {
            console.warn("Bridge IO Omitido: Ejecución en entorno Web.");
        }
    };

    // Diccionario visual de estados de compilación (Apple Human Interface Guidelines)
    const getStatusConfig = () => {
        switch (scriptStatus.status) {
            case 'RUNNING': return { color: '#34c759', bg: 'rgba(52, 199, 89, 0.1)', text: 'En Ejecución' };
            case 'COMPILE_ERROR':
            case 'RUNTIME_ERROR': return { color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.1)', text: 'Error Lógico' };
            case 'COMPILING': return { color: '#ff9500', bg: 'rgba(255, 149, 0, 0.1)', text: 'Compilando...' };
            case 'LOADED': return { color: '#0071e3', bg: 'var(--accent-subtle)', text: 'Listo para Inyectar' };
            default: return { color: 'var(--text-secondary)', bg: 'var(--bg-input)', text: 'Inactivo' };
        }
    };

    const statusConfig = getStatusConfig();
    const isDark = document.documentElement.classList.contains('dark-theme'); // Detección de tema raíz

    return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>

            {/* HEADER DE HERRAMIENTAS - CLEAN UX */}
            <div style={{
                height: '44px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0,
                boxShadow: 'var(--shadow-sm)', zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>
                            {activeEntity ? activeEntity.name : 'Sin Selección'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                            ID: {selectedEntityId || '---'}
                        </span>
                    </div>

                    {activeEntity && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: statusConfig.bg, padding: '4px 10px', borderRadius: '12px', marginLeft: '12px', border: `1px solid ${statusConfig.color}22` }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusConfig.color, boxShadow: `0 0 4px ${statusConfig.color}` }} />
                            <span style={{ fontSize: '11px', color: statusConfig.color, fontWeight: '600', letterSpacing: '-0.2px' }}>
                                {statusConfig.text}
                            </span>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleCompileAndInject}
                    disabled={!selectedEntityId || scriptStatus.status === 'COMPILING'}
                    style={{
                        padding: '6px 14px',
                        background: selectedEntityId ? 'var(--accent)' : 'var(--bg-input)',
                        border: 'none',
                        color: selectedEntityId ? '#fff' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: '14px',
                        cursor: selectedEntityId ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        boxShadow: selectedEntityId ? '0 2px 6px rgba(0, 113, 227, 0.3)' : 'none',
                        opacity: scriptStatus.status === 'COMPILING' ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => { if (selectedEntityId) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={(e) => { if (selectedEntityId) e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l15-9L5 3z" /></svg>
                    Ejecutar Código
                </button>
            </div>

            {/* BARRA DE ERROR CONTEXTUAL (Aparece solo si hay error lúdico/sintáctico) */}
            {scriptStatus.error && (
                <div style={{
                    background: '#fff0f0', borderBottom: '1px solid #ffcccc', padding: '8px 16px',
                    color: '#d70015', fontSize: '11px', fontFamily: '"SF Mono", "Fira Code", monospace',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <span style={{ fontWeight: 'bold' }}>⚠ Excepción del Kernel:</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scriptStatus.error}</span>
                </div>
            )}

            {/* EDITOR MONACO INTEGRADO */}
            <div style={{ flex: 1, position: 'relative', width: '100%', background: 'var(--bg-app)' }}>
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme={isDark ? "vs-dark" : "light"}
                    value={localCode}
                    onChange={(val) => setLocalCode(val || '')}
                    onMount={(editor, monaco) => {
                        editorRef.current = editor;
                        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                            handleCompileAndInject();
                        });
                    }}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: '"SF Mono", "Fira Code", monospace',
                        fontLigatures: true,
                        readOnly: !selectedEntityId,
                        domReadOnly: !selectedEntityId,
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        renderLineHighlight: "all",
                        lineHeight: 22
                    }}
                />
            </div>
        </div>
    );
}