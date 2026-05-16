import { create } from 'zustand';

// Inicialización de la piscina de índices (Memory Management)
const MAX_ENTITIES = 2000;
const initialFreeIndices = Array.from({ length: MAX_ENTITIES }, (_, i) => MAX_ENTITIES - 1 - i);

export const useSystemicStore = create((set, get) => ({
    // --- ESTADO ESTRUCTURAL ---
    workspace: {
        studioMode: 'design', // 'design' | 'logic'
        selectedEntityId: null,
        showBlueprints: true,
        activeViewId: 'persp',
        cameraViews: { persp: {}, front: {}, top: {}, left: {}, right: {} },
        transformMode: 'translate', // 'translate' | 'scale'
        snapValue: 0.5
    },
    entities: {},
    visuals: {},
    canvasLayers: { persp: { background: [], midground: [], foreground: [] } },
    freeIndices: initialFreeIndices,

    layerPlayback: {
        paintMode: false,
        activeLayerKey: 'midground',
        currentFrameIndex: 0,
        brushColor: '#0071e3',
        brushSize: 4,
        opacityGuide: 0.5
    },

    // --- MUTADORES ATÓMICOS DE WORKSPACE ---
    setStudioMode: (mode) => set((state) => ({ workspace: { ...state.workspace, studioMode: mode } })),
    setView: (viewId) => set((state) => ({ workspace: { ...state.workspace, activeViewId: viewId } })),
    toggleBlueprints: () => set((state) => ({ workspace: { ...state.workspace, showBlueprints: !state.workspace.showBlueprints } })),
    selectEntity: (id) => set((state) => ({ workspace: { ...state.workspace, selectedEntityId: id } })),
    setTransformMode: (mode) => set((state) => ({ workspace: { ...state.workspace, transformMode: mode } })),
    setSnapValue: (val) => set((state) => ({ workspace: { ...state.workspace, snapValue: val } })),

    // --- MUTADORES DE PLAYBACK E ILUSTRACIÓN ---
    setPaintMode: (active) => set((state) => ({ layerPlayback: { ...state.layerPlayback, paintMode: active } })),
    setBrushColor: (color) => set((state) => ({ layerPlayback: { ...state.layerPlayback, brushColor: color } })),
    setBrushSize: (size) => set((state) => ({ layerPlayback: { ...state.layerPlayback, brushSize: size } })),
    setOpacityGuide: (opacity) => set((state) => ({ layerPlayback: { ...state.layerPlayback, opacityGuide: opacity } })),
    setActiveLayerKey: (key) => set((state) => ({ layerPlayback: { ...state.layerPlayback, activeLayerKey: key } })),
    setGlobalFrameIndex: (index) => set((state) => ({ layerPlayback: { ...state.layerPlayback, currentFrameIndex: index } })),

    // --- MUTADORES ATÓMICOS DE ENTIDADES ---
    registerEntity: (id, payload) => set((state) => {
        const newFreeIndices = [...state.freeIndices];
        if (newFreeIndices.length > 0) newFreeIndices.pop(); // Reclamar índice de memoria
        return {
            entities: { ...state.entities, [id]: payload },
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
        return {
            entities: {
                ...state.entities,
                [id]: { ...state.entities[id], [field]: value }
            }
        };
    }),

    applyGameplayPatch: (id, payload) => set((state) => {
        if (!state.entities[id]) return state;
        return {
            entities: {
                ...state.entities,
                [id]: {
                    ...state.entities[id],
                    gameplay: { ...state.entities[id].gameplay, ...payload }
                }
            }
        };
    }),

    updateEntityScript: (id, code) => set((state) => {
        if (!state.entities[id]) return state;
        return {
            entities: {
                ...state.entities,
                [id]: { ...state.entities[id], scriptCode: code }
            }
        };
    }),

    loadSceneState: (data) => set(() => ({
        entities: data.entities || {},
        visuals: data.visuals || {},
        canvasLayers: data.canvasLayers || { persp: { background: [], midground: [], foreground: [] } }
    })),

    applyPatch: (payload) => set((state) => {
        // Reservado para parches globales asíncronos del Kernel
        return { ...state, ...payload };
    })
}));