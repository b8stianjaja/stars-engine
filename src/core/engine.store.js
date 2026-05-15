import { create } from 'zustand';

export const useSystemicStore = create((set) => ({
    entities: {}, // Atributos JSON [cite: 34]
    visuals: {},  // Hashes de assets [cite: 34]

    applyPatch: (patch) => set((state) => ({
        entities: { ...state.entities, ...patch }
    })),

    registerEntity: (id, data, visualHash) => set((state) => ({
        entities: { ...state.entities, [id]: data },
        visuals: { ...state.visuals, [id]: visualHash }
    })),
}));