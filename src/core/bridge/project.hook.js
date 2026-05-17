import { useState, useCallback } from 'react';
import { SceneSerializer } from './serializer';

export function useProjectSystem(worker) {
    const [isProcessing, setIsProcessing] = useState({ save: false, load: false });

    const handleSave = useCallback(async () => {
        if (isProcessing.save) return;

        setIsProcessing(prev => ({ ...prev, save: true }));
        try {
            // Empuja el I/O al final de la cola de microtareas para no interrumpir el frame actual de R3F
            await Promise.resolve();
            await SceneSerializer.saveCurrentScene();
        } catch (err) {
            console.error("[ProjectSystem Error]: Falla crítica en volcado de memoria a disco.", err);
        } finally {
            setIsProcessing(prev => ({ ...prev, save: false }));
        }
    }, [isProcessing.save]);

    const handleLoad = useCallback(async () => {
        if (isProcessing.load || !worker) return;

        setIsProcessing(prev => ({ ...prev, load: true }));
        try {
            await Promise.resolve();
            await SceneSerializer.loadCurrentScene(worker);
        } catch (err) {
            console.error("[ProjectSystem Error]: Falla crítica hidratando memoria desde disco.", err);
        } finally {
            setIsProcessing(prev => ({ ...prev, load: false }));
        }
    }, [isProcessing.load, worker]);

    return {
        isSaving: isProcessing.save,
        isLoading: isProcessing.load,
        handleSave,
        handleLoad
    };
}