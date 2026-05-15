import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

// Componentes base como plantillas de datos puros
export const ComponentTemplates = {
    Transform: (pos = [0, 0, 0], rot = [0, 0, 0], sca = [1, 1, 1]) => ({ pos, rot, sca }),
    Sprite: (atlas = null, frame = 0, layer = 0) => ({ atlas, frame, layer, visible: true }),
    Stats: (health = 100, hunger = 100, sanity = 100) => ({ health, hunger, sanity, statusEffects: [] }),
    Script: (source = '') => ({ source, enabled: true }),
    Animation: (sequence = 'idle', frameRate = 12, loop = true) => ({
        sequence,
        frameRate,
        loop,
        currentFrame: 0,
        elapsedTime: 0,
        isPlaying: true,
        atlasData: null // Metadata del .json del atlas
    })
};

export const useEngineStore = create(
    persist(
        (set, get) => ({
            // Estado del Mundo (Normalizado)
            entities: {}, // ID -> { id, name, components }
            scenes: {
                'scene_main': { id: 'scene_main', name: 'Main Scene', entityIds: [] }
            },
            activeSceneId: 'scene_main',
            playState: 'STOPPED', // STOPPED, PLAYING, PAUSED

            // Acciones Atómicas (Solo modifican datos)
            addEntity: (name = 'New Entity', components = {}) => {
                const id = uuidv4();
                const newEntity = {
                    id,
                    name,
                    components: {
                        Transform: ComponentTemplates.Transform(),
                        ...components
                    }
                };

                set(state => ({
                    entities: { ...state.entities, [id]: newEntity },
                    scenes: {
                        ...state.scenes,
                        [state.activeSceneId]: {
                            ...state.scenes[state.activeSceneId],
                            entityIds: [...state.scenes[state.activeSceneId].entityIds, id]
                        }
                    }
                }));
                return id;
            },

            updateComponent: (entityId, componentName, data) => set(state => {
                const entity = state.entities[entityId];
                if (!entity) return state;
                return {
                    entities: {
                        ...state.entities,
                        [entityId]: {
                            ...entity,
                            components: {
                                ...entity.components,
                                [componentName]: { ...entity.components[componentName], ...data }
                            }
                        }
                    }
                };
            }),

            removeEntity: (id) => set(state => {
                const newEntities = { ...state.entities };
                delete newEntities[id];
                const scene = state.scenes[state.activeSceneId];
                return {
                    entities: newEntities,
                    scenes: {
                        ...state.scenes,
                        [state.activeSceneId]: {
                            ...scene,
                            entityIds: scene.entityIds.filter(eid => eid !== id)
                        }
                    }
                };
            }),

            setPlayState: (playState) => set({ playState })
        }),
        {
            name: 'stars-engine-core-v2',
            storage: createJSONStorage(() => ({
                getItem: idbGet,
                setItem: idbSet,
                removeItem: idbDel
            })),
            // Sincronización LAN: Solo persistimos datos, no instancias de motor
            partialize: (state) => ({
                entities: state.entities,
                scenes: state.scenes,
                activeSceneId: state.activeSceneId
            })
        }
    )
);