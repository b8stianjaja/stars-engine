// src/core/store/scene.slice.js
import { EngineMemory } from '../config/memory.config';

const MAX_ENTITIES = 2000;
const STRIDE_FLOATS = 16;

let sceneNetworkSyncEmitter = null;

/**
 * Registers a static high-performance callback pointer for scene orchestration events,
 * avoiding microtask allocation cycles and keeping the multi-user environment unified.
 */
export const setSceneNetworkSyncEmitter = (emitterFn) => {
    sceneNetworkSyncEmitter = emitterFn;
};

export const createSceneSlice = (set, get) => ({
    sceneRegistry: {
        currentSceneId: 'scene_main_menu',
        scenes: {
            'scene_main_menu': {
                name: 'Menú Principal (Inicio)',
                entities: {},
                canvasLayers: { background: null, midground: null, foreground: null }
            }
        }
    },

    createScene: (name, remoteOrigin = false, forcedId = null) => set((state) => {
        const id = forcedId ?? `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newScenes = { ...state.sceneRegistry.scenes };
        newScenes[id] = {
            name: name ?? 'Nueva Escena Alfa',
            entities: {},
            canvasLayers: { background: null, midground: null, foreground: null }
        };

        if (!remoteOrigin && sceneNetworkSyncEmitter) {
            sceneNetworkSyncEmitter('NET_SCENE_CREATE', { id, name });
        }

        return { sceneRegistry: { ...state.sceneRegistry, scenes: newScenes } };
    }),

    commitActiveSceneSnapshot: () => {
        const state = get();
        const currentSceneId = state.sceneRegistry.currentSceneId;

        // DEFENSIBLE RUNTIME IMPORT INTERCEPT: Completely isolates module cycle compilation paths
        const currentSnapshot = { entities: {}, canvasLayers: { background: null, midground: null, foreground: null } };

        if (EngineMemory && EngineMemory.physicsBuffer) {
            const physicsView = new Float32Array(EngineMemory.physicsBuffer);
            const entitiesSnapshot = JSON.parse(JSON.stringify(state.entities ?? {}));

            Object.keys(entitiesSnapshot).forEach(id => {
                const entity = entitiesSnapshot[id];
                if (entity && typeof entity.index === 'number') {
                    const offset = entity.index * STRIDE_FLOATS;

                    entity.position = [
                        physicsView[offset + 0],
                        physicsView[offset + 1],
                        physicsView[offset + 2]
                    ];
                    entity.quaternion = [
                        physicsView[offset + 3],
                        physicsView[offset + 4],
                        physicsView[offset + 5],
                        physicsView[offset + 6]
                    ];
                    entity.scale = [
                        physicsView[offset + 7],
                        physicsView[offset + 8],
                        physicsView[offset + 9]
                    ];

                    if (!entity.properties) entity.properties = {};
                    entity.properties.lastVelocityY = physicsView[offset + 10];
                    entity.properties.isGrounded = physicsView[offset + 11] === 1.0;
                }
            });
            currentSnapshot.entities = entitiesSnapshot;
        } else {
            currentSnapshot.entities = JSON.parse(JSON.stringify(state.entities ?? {}));
        }

        // Pull canvas element layers sequentially
        ['background', 'midground', 'foreground'].forEach(layerId => {
            const canvasElement = document.getElementById(`drawing-canvas-${layerId}`);
            if (canvasElement) {
                const context = canvasElement.getContext('2d');
                if (context) {
                    try {
                        const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
                        const pixelBuffer = new Uint32Array(imageData.data.buffer);
                        if (pixelBuffer.some(p => p !== 0)) {
                            currentSnapshot.canvasLayers[layerId] = canvasElement.toDataURL('image/png');
                        }
                    } catch (e) {
                        // Suppress contextual capture anomalies during fast transits
                    }
                }
            }
        });

        const updatedScenes = { ...state.sceneRegistry.scenes };
        if (updatedScenes[currentSceneId]) {
            updatedScenes[currentSceneId] = {
                name: updatedScenes[currentSceneId].name,
                entities: currentSnapshot.entities,
                canvasLayers: currentSnapshot.canvasLayers
            };
        }

        set({
            entities: currentSnapshot.entities,
            sceneRegistry: { ...state.sceneRegistry, scenes: updatedScenes }
        });
    },

    switchScene: async (targetSceneId, worker, remoteOrigin = false) => {
        const store = get();
        const currentSceneId = store.sceneRegistry.currentSceneId;

        if (currentSceneId === targetSceneId) return;

        // 1. Force back-migration and freeze outgoing level state
        store.commitActiveSceneSnapshot();

        const refreshedStore = get();
        const targetSnapshot = refreshedStore.sceneRegistry.scenes[targetSceneId];
        if (!targetSnapshot) return;

        if (!remoteOrigin && sceneNetworkSyncEmitter) {
            sceneNetworkSyncEmitter('NET_SCENE_SWITCH', { targetSceneId });
        }

        // 2. Instruct Kernel Worker to purge active physical structures
        if (worker) {
            worker.postMessage({ type: 'CLEAR_PHYSICS_WORLD' });
        }

        // 3. INDEX POOL SANITATION: Calculate clean allocations for incoming scene
        const usedIndices = Object.values(targetSnapshot.entities || {}).map(e => e.index);
        const clearedFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i)
            .filter(idx => !usedIndices.includes(idx));

        set({
            entities: {},
            freeIndices: clearedFreeIndices,
            workspace: { ...refreshedStore.workspace, selectedEntityId: null },
            sceneRegistry: { ...refreshedStore.sceneRegistry, currentSceneId: targetSceneId }
        });

        // 4. Hydrate Frontend and push logical/physical configurations to Worker
        const nextStore = get();
        Object.keys(targetSnapshot.entities || {}).forEach(id => {
            const entityData = targetSnapshot.entities[id];
            nextStore.registerEntity(id, entityData, true);

            if (worker) {
                worker.postMessage({
                    type: 'ADD_ENTITY_LOGIC',
                    payload: {
                        id,
                        index: entityData.index,
                        name: entityData.name,
                        type: entityData.type,
                        scriptCode: entityData.scriptCode,
                        properties: entityData.properties,
                        x: entityData.position?.[0] ?? 0,
                        y: entityData.position?.[1] ?? 0,
                        z: entityData.position?.[2] ?? 0,
                        rotX: entityData.quaternion?.[0] ?? 0,
                        rotY: entityData.quaternion?.[1] ?? 0,
                        rotZ: entityData.quaternion?.[2] ?? 0,
                        rotW: entityData.quaternion?.[3] ?? 1,
                        scaleX: entityData.scale?.[0] ?? 1,
                        scaleY: entityData.scale?.[1] ?? 1,
                        scaleZ: entityData.scale?.[2] ?? 1
                    }
                });
            }
        });

        // 5. Synchronous UI Canvas Layer Overlays Painting
        ['background', 'midground', 'foreground'].forEach(layerId => {
            const canvasElement = document.getElementById(`drawing-canvas-${layerId}`);
            if (canvasElement) {
                const context = canvasElement.getContext('2d');
                if (context) {
                    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

                    const cachedDataUrl = targetSnapshot.canvasLayers?.[layerId];
                    if (cachedDataUrl) {
                        const runtimeImage = new Image();
                        runtimeImage.onload = () => {
                            context.drawImage(runtimeImage, 0, 0);
                        };
                        runtimeImage.src = cachedDataUrl;
                    }
                }
            }
        });

        console.log(`[SceneSystem] Context switch completed cleanly. Active Target: ${targetSceneId}`);
    },

    hydrateFullStoryboard: (bundleData, worker, remoteOrigin = false) => {
        const store = get();
        if (!bundleData || !bundleData.sceneRegistry) return;

        if (!remoteOrigin && sceneNetworkSyncEmitter) {
            sceneNetworkSyncEmitter('NET_STORYBOARD_HYDRATE', { bundleData });
        }

        if (worker) {
            worker.postMessage({ type: 'CLEAR_PHYSICS_WORLD' });
        }

        // Deep wipe active collections to isolate incoming layout state
        set({
            entities: {},
            freeIndices: Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i),
            workspace: { ...store.workspace, selectedEntityId: null },
            sceneRegistry: {
                currentSceneId: bundleData.sceneRegistry.currentSceneId,
                scenes: bundleData.sceneRegistry.scenes
            }
        });

        const activeSceneId = bundleData.sceneRegistry.currentSceneId;
        const activeSnapshot = bundleData.sceneRegistry.scenes[activeSceneId];

        if (activeSnapshot) {
            const usedIndices = Object.values(activeSnapshot.entities || {}).map(e => e.index);
            const currentFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i)
                .filter(idx => !usedIndices.includes(idx));

            set({ freeIndices: currentFreeIndices });

            const updatedStore = get();
            Object.keys(activeSnapshot.entities || {}).forEach(id => {
                const ent = activeSnapshot.entities[id];
                updatedStore.registerEntity(id, ent, true);
                if (worker) {
                    worker.postMessage({
                        type: 'ADD_ENTITY_LOGIC',
                        payload: {
                            id,
                            index: ent.index,
                            name: ent.name,
                            type: ent.type,
                            scriptCode: ent.scriptCode,
                            properties: ent.properties,
                            x: ent.position?.[0] ?? 0,
                            y: ent.position?.[1] ?? 0,
                            z: ent.position?.[2] ?? 0,
                            rotX: ent.quaternion?.[0] ?? 0,
                            rotY: ent.quaternion?.[1] ?? 0,
                            rotZ: ent.quaternion?.[2] ?? 0,
                            rotW: ent.quaternion?.[3] ?? 1,
                            scaleX: ent.scale?.[0] ?? 1,
                            scaleY: ent.scale?.[1] ?? 1,
                            scaleZ: ent.scale?.[2] ?? 1
                        }
                    });
                }
            });

            ['background', 'midground', 'foreground'].forEach(layerId => {
                const canvas = document.getElementById(`drawing-canvas-${layerId}`);
                if (canvas) {
                    const context = canvas.getContext('2d');
                    if (context) {
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        const dataUrl = activeSnapshot.canvasLayers?.[layerId];
                        if (dataUrl) {
                            const img = new Image();
                            img.onload = () => context.drawImage(img, 0, 0);
                            img.src = dataUrl;
                        }
                    }
                }
            });
        }
    }
});