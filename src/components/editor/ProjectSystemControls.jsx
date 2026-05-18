// src/components/editor/ProjectSystemControls.jsx
import { useState, memo } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { SceneSerializer } from '../../core/bridge/serializer';
import gsap from 'gsap';

export const ProjectSystemControls = memo(function ProjectSystemControls({ worker }) {
    const [isOperating, setIsOperating] = useState(false);
    const [operationStatus, setOperationStatus] = useState('');

    const studioMode = useSystemicStore(state => state.workspace.studioMode ?? 'design');
    const hasEntities = useSystemicStore(state => Object.keys(state.entities ?? {}).length > 0);

    // MECANISMOS DINÁMICOS DE INTERACCIÓN CINETICA (GSAP INTERPOLATIONS)
    const handleActionHover = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            scale: 1.025,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            duration: 0.2,
            ease: 'expo.out'
        });
    };

    const handleActionLeave = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            scale: 1.0,
            boxShadow: 'none',
            duration: 0.25,
            ease: 'power2.out'
        });
    };

    const handleActionPress = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            scale: 0.96,
            duration: 0.08,
            ease: 'power3.out',
            yoyo: true,
            repeat: 1
        });
    };

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

    const disabledSaveLoad = isOperating;
    const disabledExport = isOperating || !hasEntities;

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
            userSelect: 'none',
            boxSizing: 'border-box',
            width: '100%'
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
                onClick={(e) => { handleActionPress(e, disabledSaveLoad); handleSave(); }}
                onMouseEnter={(e) => handleActionHover(e, disabledSaveLoad)}
                onMouseLeave={(e) => handleActionLeave(e, disabledSaveLoad)}
                disabled={disabledSaveLoad}
                style={{
                    background: disabledSaveLoad ? '#2c2c2c' : '#0071e3',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: disabledSaveLoad ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    outline: 'none',
                    willChange: 'transform'
                }}
            >
                Guardar
            </button>

            {/* Botón: Cargar Escena Local */}
            <button
                onClick={(e) => { handleActionPress(e, disabledSaveLoad); handleLoad(); }}
                onMouseEnter={(e) => handleActionHover(e, disabledSaveLoad)}
                onMouseLeave={(e) => handleActionLeave(e, disabledSaveLoad)}
                disabled={disabledSaveLoad}
                style={{
                    background: '#2c2c2c',
                    color: disabledSaveLoad ? '#555555' : '#e0e0e0',
                    border: '1px solid #3a3a3c',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: disabledSaveLoad ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    outline: 'none',
                    willChange: 'transform'
                }}
            >
                Cargar
            </button>

            <div style={{ height: '16px', width: '1px', background: '#2c2c2c', margin: '0 4px' }} />

            {/* Botón: Exportar Distribución Standalone */}
            <button
                onClick={(e) => { handleActionPress(e, disabledExport); handleExport(); }}
                onMouseEnter={(e) => handleActionHover(e, disabledExport)}
                onMouseLeave={(e) => handleActionLeave(e, disabledExport)}
                disabled={disabledExport}
                style={{
                    background: disabledExport ? '#2c2c2c' : 'transparent',
                    color: disabledExport ? '#555555' : '#34c759',
                    border: '1px solid',
                    borderColor: disabledExport ? '#3a3a3c' : '#34c759',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: disabledExport ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    outline: 'none',
                    willChange: 'transform'
                }}
            >
                Exportar standalone (.stars)
            </button>
        </div>
    );
});