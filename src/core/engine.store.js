import { create } from 'zustand';

export const useSystemicStore = create((set) => ({
    entities: {},
    visuals: {},
    canvasLayers: {},
    freeIndices: Array.from({ length: 2000 }, (_, i) => 1999 - i),

    workspace: {
        studioMode: 'design',     // 'design' o 'logic'
        playMode: 'edit',         // 'edit' o 'play'
        activeViewId: 'free',
        showBlueprints: true,
        selectedEntityId: null,
        transformMode: 'translate',
        snapValue: 0.5,
        cameraViews: {
            free: { name: "WORKSPACE_FREE_CAMERA", position: [10, 10, 10], target: [0, 0, 0] },
            isometric: { name: "CAD_ISOMETRIC_VIEW", position: [12, 12, 12], target: [0, 0, 0], fov: 25 },
            paint_canvas: { name: "TOP_DOWN_PAINT_PLANE", position: [0, 25, 0], target: [0, 0, 0], fov: 40 }
        }
    },

    setStudioMode: (mode) => set((state) => ({
        workspace: { ...state.workspace, studioMode: mode }
    })),

    setPlayMode: (mode) => set((state) => ({
        workspace: { ...state.workspace, playMode: mode }
    })),

    updateLayerAsset: (layerKey, base64Data) => set((state) => ({
        canvasLayers: { ...state.canvasLayers, [layerKey]: base64Data }
    })),

    applyPatch: (patch) => set((state) => ({
        entities: { ...state.entities, ...patch }
    })),

    applyGameplayPatch: (id, gameplayFields) => set((state) => {
        if (!state.entities[id]) return state;
        return {
            entities: {
                ...state.entities,
                [id]: {
                    ...state.entities[id],
                    gameplay: { ...state.entities[id].gameplay, ...gameplayFields }
                }
            }
        };
    }),

    registerEntity: (id, data, visualHash) => set((state) => {
        let assignedIndex = data.index;
        let newFreeIndices = [...state.freeIndices];

        if (assignedIndex !== undefined && assignedIndex !== null) {
            newFreeIndices = newFreeIndices.filter(idx => idx !== assignedIndex);
        } else {
            if (newFreeIndices.length === 0) return state;
            assignedIndex = newFreeIndices.pop();
        }

        return {
            freeIndices: newFreeIndices,
            entities: {
                ...state.entities,
                [id]: {
                    id,
                    index: assignedIndex,
                    name: data.name || 'UNNAMED_NODE',
                    type: data.type || 'box',
                    scale: data.scale || [1, 1, 1],
                    color: data.color || '#6366f1',
                    position: data.position || [0, 0, 0],
                    scriptCode: data.scriptCode || '// COMPONENT_ROUTINE_SCRIPT\n',
                    gameplay: {
                        health: data.gameplay?.health ?? 100,
                        maxHealth: data.gameplay?.maxHealth ?? 100,
                        damage: data.gameplay?.damage ?? 15,
                        faction: data.gameplay?.faction ?? 'neutral',
                        inventory: data.gameplay?.inventory || [],
                        animRow: data.gameplay?.animRow ?? 0,
                        frameIndex: data.gameplay?.frameIndex ?? 0,
                        actorState: data.gameplay?.actorState ?? 0
                    }
                }
            },
            visuals: { ...state.visuals, [id]: visualHash }
        };
    }),

    removeEntity: (id) => set((state) => {
        if (!state.entities[id]) return state;
        const targetIndex = state.entities[id].index;
        const { [id]: _, ...remainingEntities } = state.entities;
        const { [id]: __, ...remainingVisuals } = state.visuals;

        const newFreeIndices = [...state.freeIndices];
        if (!newFreeIndices.includes(targetIndex)) {
            newFreeIndices.push(targetIndex);
            newFreeIndices.sort((a, b) => b - a);
        }

        return {
            freeIndices: newFreeIndices,
            entities: remainingEntities,
            visuals: remainingVisuals,
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

    updateEntityScript: (id, code) => set((state) => {
        if (!state.entities[id]) return state;
        return {
            entities: {
                ...state.entities,
                [id]: { ...state.entities[id], scriptCode: code }
            }
        };
    }),

    loadSceneState: (sceneData) => set((state) => {
        const entities = sceneData.entities || {};
        const visuals = sceneData.visuals || {};
        const canvasLayers = sceneData.canvasLayers || {};
        const allocatedIndices = Object.values(entities).map(e => e.index);

        const freeIndices = Array.from({ length: 2000 }, (_, i) => 1999 - i)
            .filter(idx => !allocatedIndices.includes(idx));

        return {
            entities, visuals, freeIndices, canvasLayers,
            workspace: { ...state.workspace, selectedEntityId: null }
        };
    }),

    setView: (viewId) => set((state) => ({
        workspace: { ...state.workspace, activeViewId: viewId }
    })),

    toggleBlueprints: () => set((state) => ({
        workspace: { ...state.workspace, showBlueprints: !state.workspace.showBlueprints }
    })),

    selectEntity: (id) => set((state) => ({
        workspace: { ...state.workspace, selectedEntityId: id }
    })),

    setTransformMode: (mode) => set((state) => ({
        workspace: { ...state.workspace, transformMode: mode }
    })),

    setSnapValue: (val) => set((state) => ({
        workspace: { ...state.workspace, snapValue: val }
    }))
}));