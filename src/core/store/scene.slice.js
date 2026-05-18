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

    /**
     * Instancia un contenedor estanco de nivel dentro del bundle del proyecto.
     */
    createScene: (name) => set((state) => {
        const id = `scene_${Date.now()}`;
        const newScenes = { ...state.sceneRegistry.scenes };
        newScenes[id] = {
            name: name ?? 'Nueva Escena Alfa',
            entities: {},
            canvasLayers: { background: null, midground: null, foreground: null }
        };
        return {
            sceneRegistry: { ...state.sceneRegistry, scenes: newScenes }
        };
    }),

    /**
     * Commitea los buffers de ilustración actuales del DOM y las entidades de Zustand
     * dentro del caché de la escena activa antes de realizar una conmutación.
     */
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

    /**
     * Transiciona el motor entero hacia un nuevo mapa. Purga el Web Worker,
     * reclama el pool de índices del SharedArrayBuffer y re-hidrata las texturas 2.5D.
     */
    switchScene: async (targetSceneId, worker) => {
        const store = get();
        const currentSceneId = store.sceneRegistry.currentSceneId;

        if (currentSceneId === targetSceneId) return;

        // 1. Congelar el estado visual y físico del nivel del que nos estamos retirando
        store.commitActiveSceneSnapshot();

        // Re-obtener el registro actualizado tras el commit
        const refreshedStore = get();
        const targetSnapshot = refreshedStore.sceneRegistry.scenes[targetSceneId];
        if (!targetSnapshot) return;

        // 2. Limpiar el Kernel Físico: Notificar al Worker la evacuación masiva de actores
        if (worker) {
            worker.postMessage({ type: 'CLEAR_PHYSICS_WORLD' });
        }

        // 3. Resetear el pool indexado de Zustand y liberar el direccionamiento del Stride
        const clearedFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i);

        set({
            entities: {},
            freeIndices: clearedFreeIndices,
            workspace: { ...refreshedStore.workspace, selectedEntityId: null },
            sceneRegistry: { ...refreshedStore.sceneRegistry, currentSceneId: targetSceneId }
        });

        // 4. Hidratar Zustand y el Web Worker con la base de datos de la escena de destino
        const nextStore = get();
        Object.keys(targetSnapshot.entities || {}).forEach(id => {
            const entityData = targetSnapshot.entities[id];
            // Inyectamos con bandera remota para evitar saturar sockets locales en la sincronización
            nextStore.registerEntity(id, entityData, true);

            if (worker) {
                worker.postMessage({
                    type: 'ADD_ENTITY_LOGIC',
                    payload: { id, ...entityData }
                });
            }
        });

        // 5. Flujo de Re-Pintado Síncrono de las Capas de Ilustración del Artista
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

    /**
     * Sobreescribe el registro de escenas completo al cargar un proyecto empaquetado (.stars) desde disco
     */
    hydrateFullStoryboard: (bundleData, worker) => {
        const store = get();
        if (!bundleData || !bundleData.sceneRegistry) return;

        // Vaciar el entorno actual
        if (worker) worker.postMessage({ type: 'CLEAR_PHYSICS_WORLD' });

        set({
            entities: {},
            workspace: { ...store.workspace, selectedEntityId: null },
            sceneRegistry: {
                currentSceneId: bundleData.sceneRegistry.currentSceneId,
                scenes: bundleData.sceneRegistry.scenes
            }
        });

        // Forzar la hidratación visual de la escena que quedó marcada como activa en el bundle
        const activeSceneId = bundleData.sceneRegistry.currentSceneId;
        const activeSnapshot = bundleData.sceneRegistry.scenes[activeSceneId];

        if (activeSnapshot) {
            const currentFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i);
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