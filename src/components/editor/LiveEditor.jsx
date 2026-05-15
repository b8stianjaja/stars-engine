import Editor from '@monaco-editor/react';
import { TauriBridge } from '../../core/bridge/tauri.bridge';

export function LiveEditor({ worker, currentScriptId }) {

    const handleSave = async (value) => {
        // 1. Persistencia local mediante Tauri [cite: 34]
        await TauriBridge.saveScript(`${currentScriptId}.js`, value);

        // 2. Transpilación y reinyección en el Worker 
        // En una implementación real, aquí se usaría Babel/SWC
        worker.postMessage({
            type: 'REINJECT_BEHAVIOR',
            payload: { id: currentScriptId, code: value }
        });
    };

    return (
        <div className="monaco-container" style={{ height: '400px', borderTop: '1px solid #333' }}>
            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 12 }}
                onMount={(editor) => {
                    editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS, () => {
                        handleSave(editor.getValue());
                    });
                }}
            />
        </div>
    );
}