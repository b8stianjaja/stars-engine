import { create } from 'zustand';

/**
 * STARS ENGINE V1.0 - Systemic Store (Zustand 5)
 * Centralización del flujo de datos bajo inmutabilidad y predictibilidad estricta.
 */
export const useSystemicStore = create((set) => ({
    // --- ESTADO BASE ---
    entities: {}, // Atributos JSON de las entidades de la escena
    visuals: {},  // Hashes de activos asignados

    // --- ESTADO DEL WORKSPACE DE DISEÑO ---
    workspace: {
        activeViewId: 'free',     // Puntero óptico activo ('free' o ID de vista)
        showBlueprints: true,     // Flag de renderizado (true = Sólido, false = Wireframe)
        selectedEntityId: null,   // ID de la entidad enfocada en el inspector
        cameraViews: {
            free: { name: "Cámara Libre Workspace", position: [8, 8, 8], target: [0, 0, 0] },
            isometric: { name: "Viewport Isométrico", position: [6, 6, 6], target: [0, 0, 0] },
            cinematic: { name: "Plano Picado Escena", position: [0, 5, 9], target: [0, 0, 0] }
        }
    },

    // --- ACCIONES MUTADORAS (MUTATORS) ---

    // Parches rápidos provenientes del Kernel (Web Worker)
    applyPatch: (patch) => set((state) => ({
        entities: { ...state.entities, ...patch }
    })),

    // Registro inicial compatible con la firma estricta (id, data, visualHash) de App.jsx
    registerEntity: (id, data, visualHash) => set((state) => ({
        entities: {
            ...state.entities,
            [id]: {
                id,
                index: data.index ?? 0,
                name: data.name || 'Unnamed_Entity',
                type: data.type || 'box',
                scale: data.scale || [1, 1, 1],
                color: data.color || '#4f46e5',
                position: data.position || [0, 0, 0],
                scriptCode: data.scriptCode || '// Código lógico de la entidad...\n'
            }
        },
        visuals: { ...state.visuals, [id]: visualHash }
    })),

    // Modificador paramétrico O(1) invocado desde la UI del Inspector
    updateEntityTransform: (id, field, value) => set((state) => {
        if (!state.entities[id]) return state;
        return {
            entities: {
                ...state.entities,
                [id]: { ...state.entities[id], [field]: value }
            }
        };
    }),

    // Mutador de persistencia de scripts para el LiveEditor
    updateEntityScript: (id, code) => set((state) => {
        if (!state.entities[id]) return state;
        return {
            entities: {
                ...state.entities,
                [id]: { ...state.entities[id], scriptCode: code }
            }
        };
    }),

    // --- ACCIONES DEL WORKSPACE CONTROL ---
    setView: (viewId) => set((state) => ({
        workspace: { ...state.workspace, activeViewId: viewId }
    })),

    toggleBlueprints: () => set((state) => ({
        workspace: { ...state.workspace, showBlueprints: !state.workspace.showBlueprints }
    })),

    selectEntity: (id) => set((state) => ({
        workspace: { ...state.workspace, selectedEntityId: id }
    }))
}));