// src/core/bridge/serializer.js
import { useSystemicStore } from '../engine.store';
import { TauriBridge } from './bridge.tauri';

export class SceneSerializer {

    /**
     * Extrae un canvas del DOM y lo convierte en Base64 (PNG transparente)
     */
    static getCanvasBase64(layerId) {
        const canvas = document.getElementById(`canvas-${layerId}`);
        if (!canvas) return null;

        // Comprobamos si el canvas está vacío para no guardar memoria inútil
        const ctx = canvas.getContext('2d');
        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const isBlank = !buffer.some(color => color !== 0);

        if (isBlank) return null;
        return canvas.toDataURL('image/png');
    }

    /**
     * Inyecta un Base64 de vuelta a un canvas físico
     */
    static loadCanvasFromBase64(layerId, base64Data) {
        if (!base64Data) return;
        const canvas = document.getElementById(`canvas-${layerId}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = base64Data;
    }

    /**
     * Empaqueta el estado 3D y las texturas 2D hacia Tauri
     */
    static async saveCurrentScene() {
        console.log("[Serializer] Iniciando empaquetado de escena híbrida...");
        const state = useSystemicStore.getState();

        const sceneData = {
            version: "1.0",
            camera: state.workspace.directorCameraData,
            entities: state.entities,
            layers: {
                background: this.getCanvasBase64('background'),
                midground: this.getCanvasBase64('midground'),
                foreground: this.getCanvasBase64('foreground')
            }
        };

        const success = await TauriBridge.saveScene(sceneData);
        if (success) {
            console.log("[Serializer] Escena empaquetada exitosamente.");
        }
    }

    /**
     * Lee desde Tauri y restaura la memoria 3D y el DOM
     */
    static async loadCurrentScene(worker) {
        console.log("[Serializer] Solicitando descompresión de escena...");
        const sceneData = await TauriBridge.loadScene();

        if (!sceneData) {
            console.warn("[Serializer] No se encontró escena en el disco.");
            return;
        }

        // 1. Restaurar Zustand (El estado de React)
        useSystemicStore.getState().loadSceneState(sceneData);

        // 2. Restaurar Lienzos 2D (El DOM Físico)
        if (sceneData.layers) {
            this.loadCanvasFromBase64('background', sceneData.layers.background);
            this.loadCanvasFromBase64('midground', sceneData.layers.midground);
            this.loadCanvasFromBase64('foreground', sceneData.layers.foreground);
        }

        // 3. Restaurar Memoria Física (El Web Worker)
        if (worker) {
            for (const [id, entity] of Object.entries(sceneData.entities)) {
                worker.postMessage({
                    type: 'ADD_ENTITY_LOGIC',
                    payload: { ...entity, id }
                });

                // Si tenía scripts lógicos inyectados, recomplilarlos
                if (entity.scriptCode) {
                    worker.postMessage({
                        type: 'INJECT_SCRIPT',
                        payload: { id, code: entity.scriptCode }
                    });
                }
            }
        }

        console.log("[Serializer] Escena restaurada e inyectada en el Kernel.");
    }

    /**
     * Empaqueta de forma absoluta la escena actual y abre el diálogo nativo para exportar el juego finalizado
     */
    static async exportSceneToFile() {
        console.log("[Serializer] Generando compilado listo para distribución...");
        const state = useSystemicStore.getState();

        const bundleData = {
            version: "1.0-RELEASE",
            timestamp: Date.now(),
            camera: state.workspace.directorCameraData ?? null,
            entities: state.entities ?? {},
            layers: {
                background: this.getCanvasBase64('background'),
                midground: this.getCanvasBase64('midground'),
                foreground: this.getCanvasBase64('foreground')
            }
        };

        const success = await TauriBridge.exportStandaloneScene(bundleData);
        if (success) {
            console.log("[Serializer] Exportación standalone completada sin errores.");
        } else {
            console.warn("[Serializer] El proceso de exportación fue interrumpido o falló.");
        }
    }
}