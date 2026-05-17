// src/components/editor/ProjectSystemControls.jsx
import { useState, memo } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { SceneSerializer } from '../../core/bridge/serializer';

export const ProjectSystemControls = memo(function ProjectSystemControls({ worker }) {
    const [isOperating, setIsOperating] = useState(false);
    const [operationStatus, setOperationStatus] = useState('');

    const studioMode = useSystemicStore(state => state.workspace.studioMode);
    const hasEntities = useSystemicStore(state => Object.keys(state.entities).length > 0);

    const executeSafeIO = async (label, ioTask) => {
        if (isOperating) return;
        setIsOperating(true);
        setOperationStatus(label);

        try {
            await ioTask();
        } catch (error) {
            console.error(`[ProjectSystemControls] Fallo crítico durante: ${label}`, error);
        } finally {
            setIsOperating(false);
            setOperationStatus('');
        }
    };

    const handleSave = () => {
        executeSafeIO('Guardando...', async () => {
            await SceneSerializer.saveCurrentScene();
        });
    };

    const handleLoad = () => {
        executeSafeIO('Cargando...', async () => {
            await SceneSerializer.loadCurrentScene(worker);
        });
    };

    const handleExport = () => {
        executeSafeIO('Exportando...', async () => {
            await SceneSerializer.exportSceneToFile();
        });
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: '#1e1e1e',
            borderBottom: '1px solid #2c2c2c',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '12px',
            color: '#e0e0e0',
            userSelect: 'none'
        }}>
            {/* Indicador de Estado de Operación Nativa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '12px' }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isOperating ? '#ff9500' : '#34c759',
                    transition: 'background 0.2s ease'
                }} />
                <span style={{ fontWeight: '500', color: isOperating ? '#ff9500' : '#8e8e93' }}>
                    {isOperating ? operationStatus : `Modo: ${studioMode.toUpperCase()}`}
                </span>
            </div>

            <div style={{ height: '16px', width: '1px', background: '#2c2c2c', marginRight: '4px' }} />

            {/* Botón: Guardar Escena Local */}
            <button
                onClick={handleSave}
                disabled={isOperating}
                style={{
                    background: isOperating ? '#2c2c2c' : '#0071e3',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: isOperating ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'background 0.15s ease'
                }}
            >
                Guardar
            </button>

            {/* Botón: Cargar Escena Local */}
            <button
                onClick={handleLoad}
                disabled={isOperating}
                style={{
                    background: '#2c2c2c',
                    color: isOperating ? '#555555' : '#e0e0e0',
                    border: '1px solid #3a3a3c',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: isOperating ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'background 0.15s ease, border-color 0.15s ease'
                }}
            >
                Cargar
            </button>

            <div style={{ height: '16px', width: '1px', background: '#2c2c2c', margin: '0 4px' }} />

            {/* Botón: Exportar Distribución Standalone */}
            <button
                onClick={handleExport}
                disabled={isOperating || !hasEntities}
                style={{
                    background: isOperating || !hasEntities ? '#2c2c2c' : 'transparent',
                    color: isOperating || !hasEntities ? '#555555' : '#34c759',
                    border: '1px solid',
                    borderColor: isOperating || !hasEntities ? '#3a3a3c' : '#34c759',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: isOperating || !hasEntities ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.15s ease'
                }}
            >
                Exportar standalone (.stars)
            </button>
        </div>
    );
});