import { create } from 'zustand';

/**
 * STARS ENGINE V1.0 - Systemic Store (Zustand 5)
 * Gestión inmutable de layouts profesionales, playmodes y variables de gameplay asimétricas.
 */
export const useSystemicStore = create((set) => ({
    // --- ESTADO BASE ---
    entities: {},
    visuals: {},

    // --- CAPAS DE ARTE DIBUJADO A MANO ---
    canvasLayers: {
        foreground: null,
        background: null
    },

    // --- POOL DE MEMORIA INDEXADA ---
    freeIndices: Array.from({ length: 2000 }, (_, i) => 1999 - i),

    // --- ESTADO DEL WORKSPACE DE DISEÑO ---
    workspace: {
        studioMode: 'artist',     // 'artist' o 'developer'
        playMode: 'edit',         // 'edit' (Edición/Greyboxing) o 'play' (Simulación Activa)
        activeViewId: 'free',
        showBlueprints: true,
        selectedEntityId: null,
        transformMode: 'translate',
        snapValue: 0.5,
        cameraViews: {
            free: { name: "Cámara Workspace Libre", position: [8, 8, 8], target: [0, 0, 0] },
            isometric: { name: "Viewport Isométrico CAD", position: [8, 8, 8], target: [0, 0, 0], fov: 30 },
            cinematic: { name: "Cámara Gameplay Activa", position: [0, 6, 10], target: [0, 1, 0], fov: 45 }
        }
    },

    // --- ACCIONES MUTADORAS ---

    setStudioMode: (mode) => set((state) => ({
        workspace: { ...state.workspace, studioMode: mode }
    })),

    setPlayMode: (mode) => set((state) => ({
        workspace: { ...state.workspace, playMode: mode }
    })),

    updateLayerAsset: (layer, base64Data) => set((state) => ({
        canvasLayers: { ...state.canvasLayers, [layer]: base64Data }
    })),

    applyPatch: (patch) => set((state) => ({
        entities: { ...state.entities, ...patch }
    })),

    // Mutador quirúrgico para actualizar variables de juego desde telemetría del Kernel
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
                    name: data.name || 'Unnamed_Entity',
                    type: data.type || 'box',
                    scale: data.scale || [1, 1, 1],
                    color: data.color || '#4f46e5',
                    position: data.position || [0, 0, 0],
                    scriptCode: data.scriptCode || '// Código lógico de la entidad...\n',
                    // COMPONENTES DE GAMEPLAY INDUSTRIAL INYECTADOS NATIVAMENTE
                    gameplay: {
                        health: data.gameplay?.health ?? 100,
                        maxHealth: data.gameplay?.maxHealth ?? 100,
                        damage: data.gameplay?.damage ?? 15,
                        faction: data.gameplay?.faction ?? 'neutral',
                        inventory: data.gameplay?.inventory || []
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
        const canvasLayers = sceneData.canvasLayers || { foreground: null, background: null };
        const allocatedIndices = Object.values(entities).map(e => e.index);

        const freeIndices = Array.from({ length: 2000 }, (_, i) => 1999 - i)
            .filter(idx => !allocatedIndices.includes(idx));

        return {
            entities,
            visuals,
            freeIndices,
            canvasLayers,
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