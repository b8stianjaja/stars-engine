import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useSystemicStore } from '../../core/engine.store';
import { TauriBridge } from '../../core/bridge/bridge.tauri';

export function LiveEditor({ worker }) {
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const entities = useSystemicStore(state => state.entities);
    const applyPatch = useSystemicStore(state => state.applyPatch);

    const activeEntity = entities[selectedEntityId];
    const [localCode, setLocalCode] = useState('');

    // Cada vez que el usuario cambia de entidad seleccionada en el árbol, cargamos su respectivo script
    useEffect(() => {
        if (activeEntity) {
            setLocalCode(activeEntity.scriptCode);
        } else {
            setLocalCode('// Selecciona un nodo de escena en el Inspector para programar su comportamiento...');
        }
    }, [selectedEntityId, activeEntity]);

    const handleSave = async (value) => {
        if (!selectedEntityId) return;

        // 1. Persistir el código en el Store del Main Thread
        applyPatch({ [selectedEntityId]: { scriptCode: value } });

        // 2. Inyectar en caliente al Web Worker apuntando quirúrgicamente a su ID
        if (worker) {
            worker.postMessage({
                type: 'INJECT_SCRIPT',
                payload: { id: selectedEntityId, code: value }
            });
        }

        // 3. Resguardar de forma nativa vía Tauri
        try {
            await TauriBridge.saveScript(`${selectedEntityId}.js`, value);
        } catch (e) {
            // Aislamiento silencioso de IO nativa
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