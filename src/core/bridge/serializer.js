// src/core/bridge/serializer.js
import { useSystemicStore } from '../engine.store';
import { TauriBridge } from './bridge.tauri';
import { EngineMemory } from '../config/memory.config';

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
     * Intercepta el SharedArrayBuffer y extrae los datos cinemáticos reales
     * mutados por el Web Worker para sincronizarlos en el snapshot inmutable.
     */
    static getLiveSynchronizedEntities() {
        const store = useSystemicStore.getState();
        const entitiesSnapshot = JSON.parse(JSON.stringify(store.entities ?? {}));

        if (EngineMemory && EngineMemory.physicsBuffer) {
            const floatView = new Float32Array(EngineMemory.physicsBuffer);

            Object.keys(entitiesSnapshot).forEach(id => {
                const ent = entitiesSnapshot[id];
                if (ent && typeof ent.index === 'number') {
                    const offset = ent.index * 16;

                    // FIXED STRIDE ACCESS: Eliminates index corruption and securely unifies position channels
                    ent.position = [
                        floatView[offset + 0],
                        floatView[offset + 1],
                        floatView[offset + 2]
                    ];
                    ent.quaternion = [
                        floatView[offset + 3],
                        floatView[offset + 4],
                        floatView[offset + 5],
                        floatView[offset + 6]
                    ];
                    ent.scale = [
                        floatView[offset + 7],
                        floatView[offset + 8],
                        floatView[offset + 9]
                    ];

                    if (!ent.properties) ent.properties = {};
                    ent.properties.lastVelocityY = floatView[offset + 10];
                    ent.properties.isGrounded = floatView[offset + 11] === 1.0;
                }
            });
        }
        return entitiesSnapshot;
    }

    /**
     * Serializa únicamente el estado volátil del Viewport activo extrayendo la física real.
     */
    static serializeActiveViewportState() {
        return {
            entities: this.getLiveSynchronizedEntities(),
            canvasLayers: this.captureCanvasLayers()
        };
    }

    /**
     * Compila la totalidad del Proyecto de Videojuego (El Storyboard completo).
     */
    static serializeFullProjectBundle(forceRuntime = false) {
        const store = useSystemicStore.getState();

        // Commitear el viewport activo extrayendo la memoria real antes del volcado masivo
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

    static async saveCurrentScene() {
        const fullBundle = this.serializeFullProjectBundle(false);
        return await TauriBridge.saveScene(fullBundle);
    }

    static async loadCurrentScene(worker) {
        const loadedBundle = await TauriBridge.loadScene();
        if (!loadedBundle || !loadedBundle.sceneRegistry) return false;

        const store = useSystemicStore.getState();
        store.hydrateFullStoryboard(loadedBundle, worker);
        return true;
    }

    static async exportSceneToFile() {
        const runtimeBundle = this.serializeFullProjectBundle(true);
        return await TauriBridge.exportStandaloneScene(runtimeBundle);
    }
}