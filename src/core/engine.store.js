import { create } from 'zustand';

const MAX_ENTITIES = 2000;
const initialFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i);

export const useSystemicStore = create((set, get) => ({
    // --- ESTADO ESTRUCTURAL 2.5D ---
    workspace: {
        studioMode: 'design', // 'design' | 'logic' | 'play'
        selectedEntityId: null,
        showBlueprints: true,
        transformMode: 'translate',
        snapValue: 0.5,
        cameraLocked: false,
        directorCameraData: null // { position: [x,y,z], quaternion: [x,y,z,w] }
    },
    entities: {},
    freeIndices: initialFreeIndices,

    layerPlayback: {
        paintMode: false,
        activeLayerKey: 'midground',
        brushColor: '#0071e3',
        brushSize: 4,
        opacityGuide: 0.5
    },

    // --- ESTADO COLABORATIVO (HOST LOCAL) ---
    collaboration: {
        isConnected: false,
        localRole: 'artist', // 'artist' | 'developer'
        serverUrl: 'http://localhost:3001',
        latency: 0,
        roomCode: 'LAN-SESSION'
    },

    // --- MUTADORES DE COLABORACIÓN ---
    setConnectionStatus: (connected) => set((state) => ({
        collaboration: { ...state.collaboration, isConnected: connected }
    })),
    setLatency: (ms) => set((state) => ({
        collaboration: { ...state.collaboration, latency: ms }
    })),
    setLocalRole: (role) => set((state) => {
        const modeMapping = role === 'artist' ? 'design' : 'logic';
        return {
            collaboration: { ...state.collaboration, localRole: role },
            workspace: { ...state.workspace, studioMode: modeMapping }
        };
    }),
    setServerUrl: (url) => set((state) => ({
        collaboration: { ...state.collaboration, serverUrl: url }
    })),

    // --- MUTADORES DE WORKSPACE ---
    setStudioMode: (mode) => set((state) => ({ workspace: { ...state.workspace, studioMode: mode } })),
    toggleBlueprints: () => set((state) => ({ workspace: { ...state.workspace, showBlueprints: !state.workspace.showBlueprints } })),
    selectEntity: (id) => set((state) => ({ workspace: { ...state.workspace, selectedEntityId: id } })),
    setTransformMode: (mode) => set((state) => ({ workspace: { ...state.workspace, transformMode: mode } })),
    setSnapValue: (val) => set((state) => ({ workspace: { ...state.workspace, snapValue: val } })),

    // --- MUTADORES DE CÁMARA DE DIRECTOR ---
    toggleCameraLock: () => set((state) => ({ workspace: { ...state.workspace, cameraLocked: !state.workspace.cameraLocked } })),
    saveDirectorCamera: (position, quaternion) => set((state) => ({
        workspace: { ...state.workspace, directorCameraData: { position, quaternion } }
    })),

    // --- MUTADORES DE ILUSTRACIÓN ---
    setPaintMode: (active) => set((state) => ({ layerPlayback: { ...state.layerPlayback, paintMode: active } })),
    setBrushColor: (color) => set((state) => ({ layerPlayback: { ...state.layerPlayback, brushColor: color } })),
    setBrushSize: (size) => set((state) => ({ layerPlayback: { ...state.layerPlayback, brushSize: size } })),
    setActiveLayerKey: (key) => set((state) => ({ layerPlayback: { ...state.layerPlayback, activeLayerKey: key } })),

    // --- MUTADORES ATÓMICOS DE ENTIDADES (CON INTEGRACIÓN DE RED BI-DIRECCIONAL) ---
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

        if (!remoteOrigin) {
            import('./bridge/sync.client').then(({ emitSyncEvent }) => {
                emitSyncEvent('NET_ENTITY_CREATE', { id, payload: entityData });
            });
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

        if (!remoteOrigin) {
            import('./bridge/sync.client').then(({ emitSyncEvent }) => {
                emitSyncEvent('NET_ENTITY_DELETE', { id });
            });
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

        if (!remoteOrigin) {
            import('./bridge/sync.client').then(({ emitSyncEvent }) => {
                emitSyncEvent('NET_ENTITY_TRANSFORM', { id, field, value });
            });
        }

        return { entities: { ...state.entities, [id]: { ...state.entities[id], [field]: value } } };
    }),

    updateEntityScript: (id, code, remoteOrigin = false) => set((state) => {
        if (!state.entities[id]) return state;

        if (!remoteOrigin) {
            import('./bridge/sync.client').then(({ emitSyncEvent }) => {
                emitSyncEvent('NET_ENTITY_SCRIPT', { id, code });
            });
        }

        return { entities: { ...state.entities, [id]: { ...state.entities[id], scriptCode: code } } };
    }),

    updateEntityProperty: (id, key, value, remoteOrigin = false) => set((state) => {
        if (!state.entities[id]) return state;
        const currentProperties = state.entities[id].properties ?? {};

        if (!remoteOrigin) {
            import('./bridge/sync.client').then(({ emitSyncEvent }) => {
                emitSyncEvent('NET_ENTITY_PROPERTY', { id, key, value });
            });
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
        const usedIndices = Object.values(sceneData.entities).map(e => e.index);
        const newFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => i)
            .filter(i => !usedIndices.includes(i))
            .reverse();

        return {
            entities: sceneData.entities || {},
            freeIndices: newFreeIndices,
            workspace: {
                ...state.workspace,
                directorCameraData: sceneData.camera || null,
                cameraLocked: sceneData.camera ? true : false
            }
        };
    })
}));