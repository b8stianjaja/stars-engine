import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { useUIStore } from './uiStore';

const createEmptyScene = (name) => ({
    id: uuidv4(),
    name,
    entities: [],
    director: {
        activeCamera: { position: [0, 5, 10], target: [0, 0, 0], fov: 50 },
        isCameraLocked: false,
        cameraBookmarks: []
    },
    sceneLogic: { script: `// Global Scene Script\nexport function onSceneStart(engine) {}\nexport function onSceneUpdate(engine, keys) {}` }
});

export const useSceneStore = create(
    persist(
        (set, get) => ({
            scenes: [createEmptyScene('Main Scene')],
            activeSceneId: null,
            entities: [],
            director: { activeCamera: { position: [0, 5, 10], target: [0, 0, 0], fov: 50 }, isCameraLocked: false, cameraBookmarks: [] },
            sceneLogic: { script: `` },
            systemVariables: { inventory: [], flags: {} },
            selectedEntityId: null,
            isPlaying: false,

            setSelectedEntity: (id) => set({ selectedEntityId: id }),

            toggleCameraLock: () => set((state) => {
                const nextLockState = !state.director.isCameraLocked;
                // If we unlock, we should also close the sprite editor automatically
                if (!nextLockState) {
                    useUIStore.getState().setStudioTool({ isEditingSprite: false });
                }
                return {
                    director: { ...state.director, isCameraLocked: nextLockState }
                };
            }),

            addEntity: (type = 'cube', partialData = {}) => set((state) => {
                const newEntity = {
                    id: uuidv4(),
                    name: `${type}_${state.entities.length + 1}`,
                    type,
                    color: '#555555',
                    transform: { pos: [0, 0, 0], rot: [0, 0, 0], sca: [1, 1, 1] },
                    logic: { events: [], tags: [], script: `` },
                    ...partialData
                };
                return { entities: [...state.entities, newEntity], selectedEntityId: newEntity.id };
            }),

            updateEntityData: (id, updates) => set((state) => ({
                entities: state.entities.map(e => e.id === id ? { ...e, ...updates } : e)
            })),

            syncActiveSceneToBuffer: () => set(s => {
                if (!s.activeSceneId && s.scenes.length > 0) {
                    const firstScene = s.scenes[0];
                    return { activeSceneId: firstScene.id, entities: firstScene.entities, director: firstScene.director };
                }
                return s;
            })
        }),
        {
            name: 'stars-engine-scene-v1',
            storage: createJSONStorage(() => ({
                getItem: async (name) => await idbGet(name),
                setItem: async (name, value) => await idbSet(name, value),
                removeItem: async (name) => { }
            })),
            partialize: (state) => ({
                scenes: state.scenes,
                activeSceneId: state.activeSceneId,
                entities: state.entities,
                director: state.director
            })
        }
    )
);