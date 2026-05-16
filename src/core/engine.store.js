import { create } from 'zustand';

const MAX_ENTITIES = 2000;
const initialFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i);

export const useSystemicStore = create((set, get) => ({
    // --- ESTADO ESTRUCTURAL ---
    workspace: {
        studioMode: 'design', // 'design' | 'logic' | 'play'
        selectedEntityId: null,
        showBlueprints: true,
        transformMode: 'translate',
        snapValue: 0.5,

        // --- CÁMARA DE DIRECTOR ---
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

    // --- MUTADORES ATÓMICOS DE ENTIDADES ---
    registerEntity: (id, payload) => set((state) => {
        const newFreeIndices = [...state.freeIndices];
        if (newFreeIndices.length > 0) newFreeIndices.pop();
        return {
            entities: { ...state.entities, [id]: { isGhostMask: false, ...payload } },
            freeIndices: newFreeIndices
        };
    }),

    removeEntity: (id) => set((state) => {
        const entity = state.entities[id];
        if (!entity) return state;
        const newEntities = { ...state.entities };
        delete newEntities[id];
        return {
            entities: newEntities,
            freeIndices: [...state.freeIndices, entity.index],
            workspace: {
                ...state.workspace,
                selectedEntityId: state.workspace.selectedEntityId === id ? null : state.workspace.selectedEntityId
            }
        };
    }),

    updateEntityTransform: (id, field, value) => set((state) => {
        if (!state.entities[id]) return state;
        return { entities: { ...state.entities, [id]: { ...state.entities[id], [field]: value } } };
    }),

    updateEntityScript: (id, code) => set((state) => {
        if (!state.entities[id]) return state;
        return { entities: { ...state.entities, [id]: { ...state.entities[id], scriptCode: code } } };
    }),

    setEntityAsMask: (id, isMask) => set((state) => {
        if (!state.entities[id]) return state;
        return { entities: { ...state.entities, [id]: { ...state.entities[id], isGhostMask: isMask } } };
    }),

    updateSpriteAnimation: (id, frameIndex, direction) => set((state) => {
        if (!state.entities[id]) return state;
        return { entities: { ...state.entities, [id]: { ...state.entities[id], spriteState: { frameIndex, direction } } } };
    })
}));