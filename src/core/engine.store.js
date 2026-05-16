import { create } from 'zustand';

export const useSystemicStore = create((set) => ({
    entities: {},
    visuals: {},
    // Diccionario de Lienzos de Calco 2D por Cámara: canvasLayers[viewId][layerKey] = [base64_f0, base64_f1, ...]
    canvasLayers: {
        free: { background: [], midground: [], foreground: [] },
        isometric: { background: [], midground: [], foreground: [] },
        top: { background: [], midground: [], foreground: [] },
        front: { background: [], midground: [], foreground: [] },
        right: { background: [], midground: [], foreground: [] }
    },
    layerPlayback: {
        activeLayerKey: 'background',
        currentFrameIndex: 0,
        paintMode: false,
        brushColor: '#ff00aa',
        brushSize: 6,
        opacityGuide: 0.5 // Opacidad del andamiaje 3D de referencia al dibujar
    },
    freeIndices: Array.from({ length: 2000 }, (_, i) => 1999 - i),

    workspace: {
        studioMode: 'design',
        playMode: 'edit',
        activeViewId: 'free',
        showBlueprints: true,
        selectedEntityId: null,
        transformMode: 'translate',
        snapValue: 0.5,
        cameraViews: {
            free: { name: "PERSPECTIVE_FREE", position: [10, 10, 10], target: [0, 0, 0], isFixed: false },
            isometric: { name: "DIORAMA_ISOMETRIC", position: [12, 12, 12], target: [0, 0, 0], fov: 25, isFixed: false },
            top: { name: "TOP_SCAFFOLD_VIEW", position: [0, 25, 0], target: [0, 0, 0], fov: 40, isFixed: true },
            front: { name: "FRONT_SCAFFOLD_VIEW", position: [0, 0, 25], target: [0, 0, 0], fov: 40, isFixed: true },
            right: { name: "RIGHT_SCAFFOLD_VIEW", position: [25, 0, 0], target: [0, 0, 0], fov: 40, isFixed: true }
        }
    },

    setStudioMode: (mode) => set((state) => ({
        workspace: { ...state.workspace, studioMode: mode }
    })),

    setPlayMode: (mode) => set((state) => ({
        workspace: { ...state.workspace, playMode: mode }
    })),

    updateLayerAssetFrame: (viewId, layerKey, frameIndex, base64Data) => set((state) => {
        const viewLayers = state.canvasLayers[viewId] || { background: [], midground: [], foreground: [] };
        const currentFrames = [...(viewLayers[layerKey] || [])];
        currentFrames[frameIndex] = base64Data;
        return {
            canvasLayers: {
                ...state.canvasLayers,
                [viewId]: { ...viewLayers, [layerKey]: currentFrames }
            }
        };
    }),

    setActiveLayerKey: (layerKey) => set((state) => ({
        layerPlayback: { ...state.layerPlayback, activeLayerKey: layerKey }
    })),

    setGlobalFrameIndex: (index) => set((state) => ({
        layerPlayback: { ...state.layerPlayback, currentFrameIndex: index }
    })),

    setPaintMode: (enabled) => set((state) => ({
        layerPlayback: { ...state.layerPlayback, paintMode: enabled }
    })),

    setBrushColor: (color) => set((state) => ({
        layerPlayback: { ...state.layerPlayback, brushColor: color }
    })),

    setBrushSize: (size) => set((state) => ({
        layerPlayback: { ...state.layerPlayback, brushSize: size }
    })),

    setOpacityGuide: (opacity) => set((state) => ({
        layerPlayback: { ...state.layerPlayback, opacityGuide: opacity }
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
                    id, index: assignedIndex,
                    name: data.name || 'COLLIDER_NODE',
                    type: data.type || 'box',
                    scale: data.scale || [1, 1, 1],
                    color: data.color || '#475569',
                    position: data.position || [0, 0, 0],
                    scriptCode: data.scriptCode || '// LOGIC ROUTINE\n',
                    gameplay: {
                        health: data.gameplay?.health ?? 100,
                        maxHealth: data.gameplay?.maxHealth ?? 100,
                        damage: data.gameplay?.damage ?? 0,
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

    updateCustomCameraTransform: (viewId, position, target) => set((state) => {
        if (!state.workspace.cameraViews[viewId]) return state;
        return {
            workspace: {
                ...state.workspace,
                cameraViews: {
                    ...state.workspace.cameraViews,
                    [viewId]: { ...state.workspace.cameraViews[viewId], position: [...position], target: [...target] }
                }
            }
        };
    }),

    loadSceneState: (sceneData) => set((state) => ({
        entities: sceneData.entities || {},
        visuals: sceneData.visuals || {},
        canvasLayers: sceneData.canvasLayers || state.canvasLayers,
        freeIndices: Array.from({ length: 2000 }, (_, i) => 1999 - i).filter(idx => !Object.values(sceneData.entities || {}).map(e => e.index).includes(idx)),
        workspace: { ...state.workspace, selectedEntityId: null }
    })),

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