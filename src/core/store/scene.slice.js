// src/core/store/scene.slice.js
import { SceneSerializer } from '../bridge/serializer';

const MAX_ENTITIES = 2000;

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

    createScene: (name) => set((state) => {
        const id = `scene_${Date.now()}`;
        const newScenes = { ...state.sceneRegistry.scenes };
        newScenes[id] = {
            name: name ?? 'Nueva Escena Alfa',
            entities: {},
            canvasLayers: { background: null, midground: null, foreground: null }
        };
        return { sceneRegistry: { ...state.sceneRegistry, scenes: newScenes } };
    }),

    commitActiveSceneSnapshot: () => set((state) => {
        const currentSceneId = state.sceneRegistry.currentSceneId;
        const currentSnapshot = SceneSerializer.serializeActiveViewportState();

        const updatedScenes = { ...state.sceneRegistry.scenes };
        if (updatedScenes[currentSceneId]) {
            updatedScenes[currentSceneId] = {
                name: updatedScenes[currentSceneId].name,
                entities: currentSnapshot.entities,
                canvasLayers: currentSnapshot.canvasLayers
            };
        }
        return { sceneRegistry: { ...state.sceneRegistry, scenes: updatedScenes } };
    }),

    switchScene: async (targetSceneId, worker) => {
        const store = get();
        const currentSceneId = store.sceneRegistry.currentSceneId;

        if (currentSceneId === targetSceneId) return;

        // 1. Congelar estado real del nivel saliente
        store.commitActiveSceneSnapshot();

        const refreshedStore = get();
        const targetSnapshot = refreshedStore.sceneRegistry.scenes[targetSceneId];
        if (!targetSnapshot) return;

        // 2. Limpiar el Kernel Físico del Worker
        if (worker) {
            worker.postMessage({ type: 'CLEAR_PHYSICS_WORLD' });
        }

        // 3. PROTECCIÓN CRÍTICA DE POOL: Filtrar índices ocupados por la escena destino
        const usedIndices = Object.values(targetSnapshot.entities || {}).map(e => e.index);
        const clearedFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i)
            .filter(idx => !usedIndices.includes(idx));

        set({
            entities: {},
            freeIndices: clearedFreeIndices,
            workspace: { ...refreshedStore.workspace, selectedEntityId: null },
            sceneRegistry: { ...refreshedStore.sceneRegistry, currentSceneId: targetSceneId }
        });

        // 4. Hidratar e inyectar al Worker conservando estados y códigos lógicos
        const nextStore = get();
        Object.keys(targetSnapshot.entities || {}).forEach(id => {
            const entityData = targetSnapshot.entities[id];
            nextStore.registerEntity(id, entityData, true);

            if (worker) {
                worker.postMessage({
                    type: 'ADD_ENTITY_LOGIC',
                    payload: { id, ...entityData }
                });
            }
        });

        // 5. Flujo de Re-Pintado Síncrono de Capas
        ['background', 'midground', 'foreground'].forEach(layerId => {
            const canvasElement = document.getElementById(`drawing-canvas-${layerId}`);
            if (canvasElement) {
                const context = canvasElement.getContext('2d');
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
        });

        console.log(`[SceneSystem] Conmutación de contexto completada con éxito. Target: ${targetSceneId}`);
    },

    hydrateFullStoryboard: (bundleData, worker) => {
        const store = get();
        if (!bundleData || !bundleData.sceneRegistry) return;

        if (worker) worker.postMessage({ type: 'CLEAR_PHYSICS_WORLD' });

        set({
            entities: {},
            workspace: { ...store.workspace, selectedEntityId: null },
            sceneRegistry: {
                currentSceneId: bundleData.sceneRegistry.currentSceneId,
                scenes: bundleData.sceneRegistry.scenes
            }
        });

        const activeSceneId = bundleData.sceneRegistry.currentSceneId;
        const activeSnapshot = bundleData.sceneRegistry.scenes[activeSceneId];

        if (activeSnapshot) {
            // Sincronizar el pool en hidratación de disco duro
            const usedIndices = Object.values(activeSnapshot.entities || {}).map(e => e.index);
            const currentFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i)
                .filter(idx => !usedIndices.includes(idx));

            set({ freeIndices: currentFreeIndices });

            const updatedStore = get();
            Object.keys(activeSnapshot.entities || {}).forEach(id => {
                const ent = activeSnapshot.entities[id];
                updatedStore.registerEntity(id, ent, true);
                if (worker) {
                    worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, ...ent } });
                }
            });

            ['background', 'midground', 'foreground'].forEach(layerId => {
                const canvas = document.getElementById(`drawing-canvas-${layerId}`);
                if (canvas) {
                    const context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    const dataUrl = activeSnapshot.canvasLayers?.[layerId];
                    if (dataUrl) {
                        const img = new Image();
                        img.onload = () => context.drawImage(img, 0, 0);
                        img.src = dataUrl;
                    }
                }
            });
        }
    }
});