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

    const handleActionHover = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            y: -0.5,
            duration: 0.15,
            ease: 'power1.out'
        });
    };

    const handleActionLeave = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            backgroundColor: 'transparent',
            y: 0,
            duration: 0.2,
            ease: 'power2.out'
        });
    };

    const handlePrimaryHover = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            backgroundColor: '#007aff',
            boxShadow: '0 2px 8px rgba(0, 113, 227, 0.4)',
            duration: 0.15,
            ease: 'power1.out'
        });
    };

    const handlePrimaryLeave = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            backgroundColor: '#0071e3',
            boxShadow: 'none',
            duration: 0.2,
            ease: 'power2.out'
        });
    };

    const handleActionPress = (e, isDisabled) => {
        if (isDisabled) return;
        gsap.to(e.currentTarget, {
            scale: 0.96,
            duration: 0.06,
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
            // CRITICAL FIX: Extract actual live store object before serialization loop
            const currentStoreState = useSystemicStore.getState();
            if (!currentStoreState) {
                throw new Error("Core store instance could not be resolved.");
            }
            await SceneSerializer.saveCurrentScene(currentStoreState);
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
            gap: '6px',
            padding: '5px 14px',
            background: '#141416',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '11px',
            color: '#bfbfbf',
            userSelect: 'none',
            boxSizing: 'border-box',
            width: '100%',
            height: '32px',
            flexShrink: 0
        }}>
            {/* OPERATION STATUS STATE INDICATOR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
                <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isOperating ? '#ff9500' : '#30d158',
                    boxShadow: isOperating ? '0 0 6px #ff9500' : '0 0 6px #30d158',
                    transition: 'all 0.2s ease'
                }} />
                <span style={{ fontFamily: 'monospace', fontWeight: '700', color: isOperating ? '#ff9500' : '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                    {isOperating ? operationStatus : `SYS:${studioMode}`}
                </span>
            </div>

            <div style={{ height: '12px', width: '1px', background: 'rgba(255,255,255,0.1)', marginRight: '6px' }} />

            {/* ACTION: SAVE SCENE */}
            <button
                onClick={(e) => { handleActionPress(e, disabledSaveLoad); handleSave(); }}
                onMouseEnter={(e) => handlePrimaryHover(e, disabledSaveLoad)}
                onMouseLeave={(e) => handlePrimaryLeave(e, disabledSaveLoad)}
                disabled={disabledSaveLoad}
                style={{
                    background: disabledSaveLoad ? 'rgba(255,255,255,0.02)' : '#0071e3',
                    color: disabledSaveLoad ? '#555555' : '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 12px',
                    fontSize: '11px',
                    cursor: disabledSaveLoad ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    outline: 'none',
                    willChange: 'transform',
                    transition: 'color 0.2s, opacity 0.2s'
                }}
            >
                Guardar Escena
            </button>

            {/* ACTION: LOAD SCENE */}
            <button
                onClick={(e) => { handleActionPress(e, disabledSaveLoad); handleLoad(); }}
                onMouseEnter={(e) => handleActionHover(e, disabledSaveLoad)}
                onMouseLeave={(e) => handleActionLeave(e, disabledSaveLoad)}
                disabled={disabledSaveLoad}
                style={{
                    background: 'transparent',
                    color: disabledSaveLoad ? '#444444' : '#e5e5ea',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    padding: '2px 12px',
                    fontSize: '11px',
                    cursor: disabledSaveLoad ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    outline: 'none',
                    willChange: 'transform'
                }}
            >
                Cargar
            </button>

            <div style={{ height: '12px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 6px' }} />

            {/* ACTION: STANDALONE EXE BUNDLER */}
            <button
                onClick={(e) => { handleActionPress(e, disabledExport); handleExport(); }}
                onMouseEnter={(e) => {
                    if (disabledExport) return;
                    gsap.to(e.currentTarget, { backgroundColor: 'rgba(48, 209, 88, 0.1)', borderColor: '#30d158', duration: 0.15 });
                }}
                onMouseLeave={(e) => {
                    if (disabledExport) return;
                    gsap.to(e.currentTarget, { backgroundColor: 'transparent', borderColor: 'rgba(48, 209, 88, 0.4)', duration: 0.2 });
                }}
                disabled={disabledExport}
                style={{
                    background: 'transparent',
                    color: disabledExport ? '#444444' : '#30d158',
                    border: '1px solid',
                    borderColor: disabledExport ? 'rgba(255,255,255,0.08)' : 'rgba(48, 209, 88, 0.4)',
                    borderRadius: '4px',
                    padding: '2px 12px',
                    fontSize: '11px',
                    cursor: disabledExport ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    outline: 'none',
                    willChange: 'transform'
                }}
            >
                Compilar Standalone (.exe)
            </button>
        </div>
    );
});