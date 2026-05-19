// src/core/bridge/serializer.js
import { EngineMemory } from '../config/memory.config';
import { TauriBridge } from './bridge.tauri';

export class SceneSerializer {
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
     * Intercepts the SharedArrayBuffer executing native Atomics load chains
     * to completely block torn reads during high-frequency worker mutations.
     */
    static getLiveSynchronizedEntities(currentEntities) {
        const entitiesSnapshot = JSON.parse(JSON.stringify(currentEntities ?? {}));

        if (EngineMemory && EngineMemory.physicsBuffer) {
            const floatView = new Float32Array(EngineMemory.physicsBuffer);
            const int32SyncView = new Int32Array(EngineMemory.physicsBuffer);

            Object.keys(entitiesSnapshot).forEach(id => {
                const ent = entitiesSnapshot[id];
                if (ent && typeof ent.index === 'number') {
                    const offset = ent.index * 16;
                    const syncIndex = offset + 15;

                    // DEFENSIVE PROGRAMMING SPINLOCK SPIN REGULATION
                    // If the worker is actively writing to this stride, spin-wait until cleared
                    let lockState = Atomics.load(int32SyncView, syncIndex);
                    let maxSpins = 1000;
                    while (lockState === 1 && maxSpins > 0) {
                        lockState = Atomics.load(int32SyncView, syncIndex);
                        maxSpins--;
                    }

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

    static serializeActiveViewportState(currentEntities) {
        return {
            entities: this.getLiveSynchronizedEntities(currentEntities),
            canvasLayers: this.captureCanvasLayers()
        };
    }

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

    static async saveCurrentScene(currentStoreState) {
        const fullBundle = this.serializeFullProjectBundle(currentStoreState, false);
        return await TauriBridge.saveScene(fullBundle);
    }
}