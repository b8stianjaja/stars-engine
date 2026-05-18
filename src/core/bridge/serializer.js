// src/core/bridge/serializer.js
import { useSystemicStore } from '../engine.store';
import { TauriBridge } from './bridge.tauri';

export class SceneSerializer {
    /**
     * Captura la trinidad de datos de memoria y empaqueta el estado actual del motor.
     * @param {boolean} forceRuntimeLayout - Fuerza al payload a comportarse como juego final ejecutable
     * @returns {Object} Proyecto unificado listo para distribución o guardado local
     */
    static serializeWorkspace(forceRuntimeLayout = false) {
        const store = useSystemicStore.getState();

        const projectPackage = {
            engineVersion: "1.0.0",
            timestamp: Date.now(),
            editorVisible: !forceRuntimeLayout, // Apaga la UI si se genera un Runtime compilado
            workspace: {
                studioMode: forceRuntimeLayout ? "design" : store.workspace.studioMode,
                selectedEntityId: null
            },
            layerPlayback: {
                paintMode: store.layerPlayback.paintMode,
                activeLayer: store.layerPlayback.activeLayer,
                playbackSpeed: store.layerPlayback.playbackSpeed
            },
            entities: store.entities ?? {},
            canvasLayers: {
                background: null,
                midground: null,
                foreground: null
            }
        };

        // Captura y serialización de los lienzos dinámicos de ilustración 2D
        ['background', 'midground', 'foreground'].forEach(layerId => {
            const canvasElement = document.getElementById(`drawing-canvas-${layerId}`);
            if (canvasElement) {
                const context = canvasElement.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
                    const buffer = new Uint32Array(imageData.data.buffer);

                    // Optimización de asignación: Evita procesar Base64 de capas vacías sin píxeles pintados
                    const hasData = buffer.some(pixel => pixel !== 0);
                    if (hasData) {
                        projectPackage.canvasLayers[layerId] = canvasElement.toDataURL('image/png');
                    }
                }
            }
        });

        return projectPackage;
    }

    /**
     * Guarda el estado de la sesión actual en el canal de persistencia seguro del puente
     */
    static async saveCurrentScene() {
        const payload = this.serializeWorkspace(false);
        return await TauriBridge.saveScene(payload);
    }

    /**
     * Restaura el estado total de la simulación e hidrata el buffer compartido a partir de un archivo
     */
    static async loadCurrentScene(worker) {
        const data = await TauriBridge.loadScene();
        if (!data) return false;

        const store = useSystemicStore.getState();

        // 1. Purgar el mapa de entidades activo en el núcleo de Zustand
        Object.keys(store.entities).forEach(id => store.removeEntity(id));

        // 2. Re-inyectar las entidades cargadas al buffer a 60Hz e hidratar hilos concurrentes
        if (data.entities) {
            Object.keys(data.entities).forEach(id => {
                const entity = data.entities[id];
                store.registerEntity(id, entity);

                if (worker) {
                    worker.postMessage({
                        type: 'ADD_ENTITY_LOGIC',
                        payload: { id, ...entity }
                    });
                }
            });
        }

        // 3. Re-pintar de forma síncrona los assets de ilustración 2D en los elementos del DOM
        if (data.canvasLayers) {
            Object.keys(data.canvasLayers).forEach(layerId => {
                const dataUrl = data.canvasLayers[layerId];
                const canvasElement = document.getElementById(`drawing-canvas-${layerId}`);
                if (canvasElement && dataUrl) {
                    const context = canvasElement.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
                        context.drawImage(img, 0, 0);
                    };
                    img.src = dataUrl;
                }
            });
        }

        // 4. Restaurar variables operativas del espacio de trabajo
        if (data.workspace?.studioMode) {
            store.setStudioMode(data.workspace.studioMode);
        }

        return true;
    }

    /**
     * AUTOMATIZACIÓN DE EXPORTACIÓN NATIVA: Genera el ejecutable (.exe) final y empaqueta la carga
     */
    static async exportSceneToFile() {
        // Generar un payload forzando el modo ejecutable final sin UI lateral
        const runtimePayload = this.serializeWorkspace(true);
        return await TauriBridge.exportStandaloneScene(runtimePayload);
    }
}