import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useSystemicStore } from '../../core/engine.store';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

export function LiveEditor({ worker }) {
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const entities = useSystemicStore(state => state.entities);

    // CORRECCIÓN: Extraer la acción específica de mutación de scripts para evitar corrupción
    const updateEntityScript = useSystemicStore(state => state.updateEntityScript);

    const activeEntity = entities[selectedEntityId];
    const [localCode, setLocalCode] = useState('');

    useEffect(() => {
        if (activeEntity) {
            setLocalCode(activeEntity.scriptCode);
        } else {
            setLocalCode('// Selecciona un nodo de escena en el Inspector para programar su comportamiento...');
        }
    }, [selectedEntityId, activeEntity]);

    const handleSave = async (value) => {
        if (!selectedEntityId) return;

        // 1. Mutar el Store de forma aislada y segura sin destruir las geometrías ni transformaciones
        updateEntityScript(selectedEntityId, value);

        // 2. Inyectar en caliente al Web Worker apuntando quirúrgicamente a su ID
        if (worker) {
            worker.postMessage({
                type: 'INJECT_SCRIPT',
                payload: { id: selectedEntityId, code: value }
            });
        }

        // 3. Guardado nativo asíncrono
        try {
            await TauriBridge.saveScript(`${selectedEntityId}.js`, value);
        } catch (e) {
            // Aislamiento de IO
        }
    };

    return (
        <div style={{ height: '240px', borderTop: '1px solid #1a1a24', position: 'absolute', bottom: 0, width: '100%', zIndex: 10 }}>
            <div style={{
                position: 'absolute', top: -20, left: 280, background: '#111116', color: activeEntity ? '#ff00aa' : '#64748b',
                fontFamily: '"Fira Code", monospace', fontSize: '10px', padding: '2px 10px', borderRadius: '4px 4px 0 0', border: '1px solid #1a1a24', borderBottom: 'none'
            }}>
                CONTEXT_TARGET: {selectedEntityId ? selectedEntityId.toUpperCase() : 'NONE'}
            </div>
            <Editor
                height="100%" defaultLanguage="javascript" theme="vs-dark"
                value={localCode}
                onChange={(val) => setLocalCode(val || '')}
                options={{
                    minimap: { enabled: false }, fontSize: 12, fontFamily: '"Fira Code", monospace',
                    backgroundColor: '#09090c', readOnly: !selectedEntityId
                }}
                onMount={(editor, monaco) => {
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        handleSave(editor.getValue());
                    });
                }}
            />
        </div>
    );
}