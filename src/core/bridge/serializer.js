// src/core/bridge/serializer.js
import { useSystemicStore } from '../engine.store';
import { TauriBridge } from './bridge.tauri';

export class SceneSerializer {
    /**
     * Captura las capas de ilustración activas en el DOM de forma aislada.
     * @returns {Object} Diccionario con las tres capas codificadas en Base64 PNG
     */
    static captureCanvasLayers() {
        const layers = { background: null, midground: null, foreground: null };

        ['background', 'midground', 'foreground'].forEach(layerId => {
            const canvasElement = document.getElementById(`drawing-canvas-${layerId}`);
            if (canvasElement) {
                const context = canvasElement.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
                    const pixelBuffer = new Uint32Array(imageData.data.buffer);

                    // Comprobación de canal alfa para no almacenar Base64 de capas vacías
                    const hasPixels = pixelBuffer.some(pixel => pixel !== 0);
                    if (hasPixels) {
                        layers[layerId] = canvasElement.toDataURL('image/png');
                    }
                }
            }
        });
        return layers;
    }

    /**
     * Serializa únicamente el estado volátil del Viewport activo.
     * Utilizado para los guardados en caché intermedios durante los cambios de nivel.
     */
    static serializeActiveViewportState() {
        const store = useSystemicStore.getState();
        return {
            entities: store.entities ?? {},
            canvasLayers: this.captureCanvasLayers()
        };
    }

    /**
     * Compila la totalidad del Proyecto de Videojuego (El Storyboard completo).
     * @param {boolean} forceRuntime - Remueve paneles de edición si se exporta el juego compilado
     */
    static serializeFullProjectBundle(forceRuntime = false) {
        const store = useSystemicStore.getState();

        // Sincronizar la escena que se está editando actualmente en el registro antes del volcado a disco
        store.commitActiveSceneSnapshot();
        const refreshedStore = useSystemicStore.getState();

        return {
            engineVersion: "1.0.0",
            timestamp: Date.now(),
            editorVisible: !forceRuntime,
            sceneRegistry: refreshedStore.sceneRegistry,
            globalConfiguration: {
                studioMode: forceRuntime ? "play" : refreshedStore.workspace.studioMode
            }
        };
    }

    /**
     * Salva el Storyboard completo en la persistencia del puente híbrido.
     */
    static async saveCurrentScene() {
        const fullBundle = this.serializeFullProjectBundle(false);
        return await TauriBridge.saveScene(fullBundle);
    }

    /**
     * Carga y reconstruye el árbol completo de niveles e hidrata el motor en caliente.
     */
    static async loadCurrentScene(worker) {
        const loadedBundle = await TauriBridge.loadScene();
        if (!loadedBundle || !loadedBundle.sceneRegistry) return false;

        const store = useSystemicStore.getState();
        store.hydrateFullStoryboard(loadedBundle, worker);
        return true;
    }

    /**
     * PIPELINE DE EXPORTACIÓN FINAL (.EXE): Duplica el player nativo e inyecta el Storyboard completo.
     */
    static async exportSceneToFile() {
        const runtimeBundle = this.serializeFullProjectBundle(true);
        return await TauriBridge.exportStandaloneScene(runtimeBundle);
    }
}