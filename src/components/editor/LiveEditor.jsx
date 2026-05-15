import Editor from '@monaco-editor/react';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

/**
 * LiveEditor: Interfaz de scripting en tiempo real.
 * Al guardar (Ctrl+S), persiste el código y lo envía al Worker[cite: 86, 90].
 */
export function LiveEditor({ worker, currentScriptId = 'default_behavior' }) {

    const handleSave = async (value) => {
        console.log("[Stars Editor]: Iniciando ciclo de Hot-Swapping...");

        // 1. Persistencia local mediante el Bridge de Tauri [cite: 34, 86]
        await TauriBridge.saveScript(`${currentScriptId}.js`, value);

        // 2. Inyección directa en el Logic Worker (Simulación) [cite: 89]
        // Se envía como un mensaje para que el Worker evalúe el nuevo comportamiento
        if (worker) {
            worker.postMessage({
                type: 'INJECT_SCRIPT',
                payload: { id: currentScriptId, code: value }
            });
        }
    };

    return (
        <div style={{
            height: '300px',
            borderTop: '2px solid #1a1a1a',
            position: 'absolute',
            bottom: 0,
            width: '100%',
            zIndex: 10
        }}>
            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                defaultValue="// Escribe aquí la lógica de la entidad...\n// ent.x += 0.01;"
                options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: '"Fira Code", monospace',
                    backgroundColor: '#0a0a0a'
                }}
                onMount={(editor) => {
                    // Comando de guardado rápido
                    editor.addCommand(
                        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS,
                        () => handleSave(editor.getValue())
                    );
                }}
            />
        </div>
    );
}