// src/core/bridge/serializer.js
import { EngineMemory } from '../config/memory.config';
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
                    try {
                        const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
                        const pixelBuffer = new Uint32Array(imageData.data.buffer);

                        const hasPixels = pixelBuffer.some(pixel => pixel !== 0);
                        if (hasPixels) {
                            layers[layerId] = canvasElement.toDataURL('image/png');
                        }
                    } catch (e) {
                        console.warn(`[Serializer Canvas] Layer parsing bypassed for ${layerId}: Context unavailable.`);
                    }
                }
            }
        });
        return layers;
    }

    /**
     * Intercepta el SharedArrayBuffer y extrae los datos cinemáticos reales
     * mutados por el Web Worker para sincronizarlos en el snapshot inmutable.
     * @param {Object} currentEntities - Reference to current state entities to map against.
     * @returns {Object} Deep clone of entities combined with real-time physical telemetry.
     */
    static getLiveSynchronizedEntities(currentEntities) {
        const entitiesSnapshot = JSON.parse(JSON.stringify(currentEntities ?? {}));

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
     * @param {Object} currentEntities - Reference to active un-synchronized entities.
     */
    static serializeActiveViewportState(currentEntities) {
        return {
            entities: this.getLiveSynchronizedEntities(currentEntities),
            canvasLayers: this.captureCanvasLayers()
        };
    }

    /**
     * Compila la totalidad del Proyecto de Videojuego (El Storyboard completo).
     * @param {Object} currentStoreState - Current snapshot instance of the Zustand system.
     * @param {boolean} forceRuntime - Overwrite compilation target flags for production distributions.
     */
    static serializeFullProjectBundle(currentStoreState, forceRuntime = false) {
        return {
            engineVersion: "1.0.0",
            timestamp: Date.now(),
            editorVisible: !forceRuntime,
            sceneRegistry: currentStoreState.sceneRegistry,
            globalConfiguration: {
                studioMode: forceRuntime ? "play" : (currentStoreState.workspace?.studioMode ?? "design")
            }
        };
    }

    /**
     * Direct interface bindings for persistent disk communication layers.
     */
    static async saveCurrentScene(currentStoreState) {
        const fullBundle = this.serializeFullProjectBundle(currentStoreState, false);
        return await TauriBridge.saveScene(fullBundle);
    }
}