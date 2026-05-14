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
    sceneLogic: {
        script: `// Global Scene Script\nexport function onSceneStart(engine) {\n  // Initialize scene state\n}\n\nexport function onSceneUpdate(engine, keys) {\n  // Global gameplay loop\n}`
    }
});

export const useSceneStore = create(
    persist(
        (set, get) => ({
            // --- ESTADO DEL MUNDO Y ESCENAS ---
            scenes: [createEmptyScene('Main Scene')],
            activeSceneId: null,

            // Buffer de trabajo actual
            entities: [],
            director: { activeCamera: { position: [0, 5, 10], target: [0, 0, 0], fov: 50 }, isCameraLocked: false, cameraBookmarks: [] },
            sceneLogic: { script: `// Global Scene Script\nexport function onSceneStart(engine) {}\nexport function onSceneUpdate(engine, keys) {}` },
            systemVariables: { inventory: [], flags: {} },

            selectedEntityId: null,
            transformMode: 'translate',
            isPlaying: false,
            inputKeys: {},

            // --- ACCIONES DE ESCENA ---
            createScene: (name) => set(s => {
                const newScene = createEmptyScene(name || `Scene ${s.scenes.length + 1}`);
                const updatedScenes = s.activeSceneId ? s.scenes.map(scene =>
                    scene.id === s.activeSceneId ? { ...scene, entities: s.entities, director: s.director, sceneLogic: s.sceneLogic } : scene
                ) : s.scenes;

                return {
                    scenes: [...updatedScenes, newScene],
                    activeSceneId: newScene.id,
                    entities: newScene.entities,
                    director: newScene.director,
                    sceneLogic: newScene.sceneLogic,
                    selectedEntityId: null
                };
            }),

            switchScene: (id) => set(s => {
                if (s.activeSceneId === id) return s;
                const updatedScenes = s.scenes.map(scene =>
                    scene.id === s.activeSceneId ? { ...scene, entities: s.entities, director: s.director, sceneLogic: s.sceneLogic } : scene
                );
                const targetScene = updatedScenes.find(scene => scene.id === id);
                if (!targetScene) return { scenes: updatedScenes };

                // Reiniciamos vista y herramientas 2D comunicándonos con el uiStore
                useUIStore.getState().setStudioView({ zoom: 1, x: 0, y: 0 });

                return {
                    scenes: updatedScenes,
                    activeSceneId: id,
                    entities: targetScene.entities,
                    director: targetScene.director,
                    sceneLogic: targetScene.sceneLogic || { script: `// Global Scene Script\nexport function onSceneStart(engine) {}\nexport function onSceneUpdate(engine, keys) {}` },
                    selectedEntityId: null
                };
            }),

            syncActiveSceneToBuffer: () => set(s => {
                if (!s.activeSceneId && s.scenes.length > 0) {
                    const firstScene = s.scenes[0];
                    return {
                        activeSceneId: firstScene.id,
                        entities: firstScene.entities,
                        director: firstScene.director,
                        sceneLogic: firstScene.sceneLogic
                    };
                }
                return s;
            }),

            // --- ACCIONES DE ENTIDADES Y MOTOR ---
            setSelectedEntity: (id) => set({ selectedEntityId: id }),
            setTransformMode: (mode) => set({ transformMode: mode }),
            setInputKey: (code, pressed) => set(s => ({ inputKeys: { ...s.inputKeys, [code]: pressed } })),

            togglePlay: () => set((state) => {
                const nextPlayState = !state.isPlaying;

                // Ajustes de UI al entrar/salir de Play
                useUIStore.getState().setStudioTool({ active: 'pan' });
                if (nextPlayState) useUIStore.getState().setStudioView({ x: 0, y: 0, zoom: 1 });
                // Limpiamos notificaciones si entramos a play
                if (nextPlayState) useUIStore.setState({ notifications: [] });

                return {
                    isPlaying: nextPlayState,
                    selectedEntityId: null
                };
            }),

            toggleCameraLock: () => set((state) => ({
                director: { ...state.director, isCameraLocked: !state.director.isCameraLocked }
            })),

            updateCamera: (camUpdates) => set((state) => {
                if (state.director.isCameraLocked) return state;
                return { director: { ...state.director, activeCamera: { ...state.director.activeCamera, ...camUpdates } } };
            }),

            addEntity: (type = 'cube', partialData = {}) => set((state) => {
                const newEntity = {
                    id: uuidv4(),
                    name: `${type}_${state.entities.length + 1}`,
                    type,
                    color: '#555555',
                    transform: { pos: [0, 0, 0], rot: [0, 0, 0], sca: [1, 1, 1], ...partialData.transform },
                    logic: {
                        events: [],
                        script: `// Entity Component Script\nexport function onUpdate(entity, keys, engine) {\n  // Runs 60fps when Playtest is active\n}\n`,
                        ...partialData.logic
                    },
                    ...partialData
                };
                return { entities: [...state.entities, newEntity], selectedEntityId: newEntity.id };
            }),

            updateEntityData: (id, updates) => set((state) => ({
                entities: state.entities.map(e => e.id === id ? { ...e, ...updates } : e)
            })),

            updateEntityTransform: (id, transform) => set((state) => ({
                entities: state.entities.map(e => e.id === id ? { ...e, transform: { ...e.transform, ...transform } } : e)
            })),

            updateEntityLogic: (id, logicUpdates) => set((state) => ({
                entities: state.entities.map(e => e.id === id ? { ...e, logic: { ...e.logic, ...logicUpdates } } : e)
            })),

            updateSceneLogic: (updates) => set((state) => ({
                sceneLogic: { ...state.sceneLogic, ...updates }
            })),

            removeEntity: (id) => set((state) => ({
                entities: state.entities.filter(e => e.id !== id),
                selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId
            })),

            duplicateEntity: (id) => set((state) => {
                const entityToCopy = state.entities.find(e => e.id === id);
                if (!entityToCopy) return state;
                const newEntity = {
                    ...entityToCopy,
                    id: uuidv4(),
                    name: `${entityToCopy.name} (Copy)`,
                    transform: { ...entityToCopy.transform, pos: [entityToCopy.transform.pos[0] + 0.5, entityToCopy.transform.pos[1], entityToCopy.transform.pos[2] + 0.5] }
                };
                return { entities: [...state.entities, newEntity], selectedEntityId: newEntity.id };
            }),

            setSystemFlag: (key, value) => set((state) => ({
                systemVariables: { ...state.systemVariables, flags: { ...state.systemVariables.flags, [key]: value } }
            })),

            triggerEvent: (entityId, triggerType) => {
                const state = get();
                if (!state.isPlaying) return;
                const entity = state.entities.find(e => e.id === entityId);
                if (!entity) return;

                const addNotification = useUIStore.getState().addNotification;

                entity.logic.events.filter(ev => ev.on === triggerType).forEach(ev => {
                    if (ev.type === 'addItem') {
                        set(s => ({ systemVariables: { ...s.systemVariables, inventory: [...s.systemVariables.inventory, ev.payload] } }));
                        addNotification(`Added: ${ev.payload}`);
                    } else if (ev.type === 'notify') {
                        addNotification(ev.payload);
                    } else if (ev.type === 'customScript') {
                        try {
                            const scriptFunc = new Function('state', 'set', 'payload', ev.payload);
                            scriptFunc(get(), set, ev.payload);
                            addNotification(`Script Executed: ${entity.name}`);
                        } catch (err) {
                            console.error("Custom Script Error:", err);
                            addNotification(`Script Error! Check console.`);
                        }
                    }
                    // NOTA: 'playAnimation' ha sido retirado de aquí temporalmente, se reconectará en el Paso 3 (ArtStore).
                });
            }
        }),
        {
            name: 'stars-engine-scene-v1',
            storage: createJSONStorage(() => ({
                getItem: async (name) => {
                    const val = await idbGet(name);
                    return val || null;
                },
                setItem: async (name, value) => {
                    await idbSet(name, value);
                },
                removeItem: async (name) => { }
            })),
            partialize: (state) => ({
                scenes: state.scenes,
                activeSceneId: state.activeSceneId,
                entities: state.entities,
                director: state.director,
                sceneLogic: state.sceneLogic,
                systemVariables: state.systemVariables
            }),
            onRehydrateStorage: () => (state) => {
                state?.syncActiveSceneToBuffer();
            }
        }
    )
);