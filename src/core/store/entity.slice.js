// src/core/store/entity.slice.js

const MAX_ENTITIES = 2000;
const initialFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i);

let networkSyncEmitter = null;

/**
 * Registers a static high-performance callback pointer to bypass dynamic runtime promise imports
 * and eliminate V8 Garbage Collection microtask queue allocation churn during rapid engine edits.
 */
export const setNetworkSyncEmitter = (emitterFn) => {
    networkSyncEmitter = emitterFn;
};

export const createEntitySlice = (set, get) => ({
    entities: {},
    freeIndices: initialFreeIndices,

    // --- MUTADORES ATÓMICOS DE ENTIDADES (CON EMISORES DE RED COALESCIDOS) ---
    registerEntity: (id, payload, remoteOrigin = false) => set((state) => {
        if (state.entities[id]) return state;
        const newFreeIndices = [...state.freeIndices];
        let assignedIndex = 0;

        if (newFreeIndices.length > 0) {
            assignedIndex = newFreeIndices.pop();
        }

        const entityData = {
            isGhostMask: false,
            properties: { speed: 5, acceleration: 12 },
            index: assignedIndex,
            ...payload
        };

        if (!remoteOrigin && networkSyncEmitter) {
            networkSyncEmitter('NET_ENTITY_CREATE', { id, payload: entityData });
        }

        return {
            entities: { ...state.entities, [id]: entityData },
            freeIndices: newFreeIndices
        };
    }),

    removeEntity: (id, remoteOrigin = false) => set((state) => {
        const entity = state.entities[id];
        if (!entity) return state;

        const newEntities = { ...state.entities };
        delete newEntities[id];

        if (!remoteOrigin && networkSyncEmitter) {
            networkSyncEmitter('NET_ENTITY_DELETE', { id });
        }

        return {
            entities: newEntities,
            freeIndices: [...state.freeIndices, entity.index],
            workspace: {
                ...state.workspace,
                selectedEntityId: state.workspace.selectedEntityId === id ? null : state.workspace.selectedEntityId
            }
        };
    }),

    updateEntityTransform: (id, field, value, remoteOrigin = false) => set((state) => {
        if (!state.entities[id]) return state;

        if (!remoteOrigin && networkSyncEmitter) {
            networkSyncEmitter('NET_ENTITY_TRANSFORM', { id, field, value });
        }

        return { entities: { ...state.entities, [id]: { ...state.entities[id], [field]: value } } };
    }),

    updateEntityScript: (id, code, remoteOrigin = false) => set((state) => {
        if (!state.entities[id]) return state;

        if (!remoteOrigin && networkSyncEmitter) {
            networkSyncEmitter('NET_ENTITY_SCRIPT', { id, code });
        }

        return { entities: { ...state.entities, [id]: { ...state.entities[id], scriptCode: code } } };
    }),

    updateEntityProperty: (id, key, value, remoteOrigin = false) => set((state) => {
        if (!state.entities[id]) return state;
        const currentProperties = state.entities[id].properties ?? {};

        if (!remoteOrigin && networkSyncEmitter) {
            networkSyncEmitter('NET_ENTITY_PROPERTY', { id, key, value });
        }

        return {
            entities: {
                ...state.entities,
                [id]: {
                    ...state.entities[id],
                    properties: { ...currentProperties, [key]: value }
                }
            }
        };
    }),

    setEntityAsMask: (id, isMask) => set((state) => {
        if (!state.entities[id]) return state;
        return { entities: { ...state.entities, [id]: { ...state.entities[id], isGhostMask: isMask } } };
    }),

    loadSceneState: (sceneData) => set((state) => {
        const usedIndices = Object.values(sceneData.entities || {}).map(e => e.index);
        const newFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => i)
            .filter(i => !usedIndices.includes(i))
            .reverse();

        return {
            entities: sceneData.entities || {},
            freeIndices: newFreeIndices,
            workspace: {
                ...state.workspace,
                directorCameraData: sceneData.camera || null,
                cameraLocked: !!sceneData.camera
            }
        };
    })
});