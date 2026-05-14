import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export const useArtStore = create(
    persist(
        (set, get) => ({
            // --- ESTADO DEL ARTE Y CAPAS ---
            artLayers: [],
            activeLayerId: null,
            timeline: { isPlaying: false, currentFrame: 0, fps: 12, totalFrames: 24, onionSkin: false, tags: [] },

            // --- HISTORIAL (BOMBA DE RAM DESACTIVADA) ---
            // Reducimos el límite a 10 pasos seguros y los aislaremos de IndexedDB
            undoStack: [],
            redoStack: [],

            setTimeline: (updates) => set(s => ({ timeline: { ...s.timeline, ...updates } })),

            pushUndoState: () => set(s => ({
                // Usamos clonación profunda solo de la estructura actual para romper referencias de memoria
                undoStack: [...s.undoStack, JSON.parse(JSON.stringify(s.artLayers))].slice(-10),
                redoStack: []
            })),

            undoArtLayer: () => set(s => {
                if (s.undoStack.length === 0) return s;
                const newStack = [...s.undoStack];
                const lastState = newStack.pop();
                return {
                    artLayers: lastState,
                    undoStack: newStack,
                    redoStack: [s.artLayers, ...s.redoStack].slice(0, 10)
                };
            }),

            redoArtLayer: () => set(s => {
                if (s.redoStack.length === 0) return s;
                const newRedoStack = [...s.redoStack];
                const nextState = newRedoStack.shift();
                return {
                    artLayers: nextState,
                    undoStack: [...s.undoStack, s.artLayers].slice(-10),
                    redoStack: newRedoStack
                };
            }),

            // --- ACCIONES DE CAPAS ---
            addArtLayer: () => set(s => {
                s.pushUndoState();
                const newLayer = {
                    id: uuidv4(),
                    name: `Layer ${s.artLayers.length + 1}`,
                    frames: {},
                    zIndex: s.artLayers.length,
                    visible: true,
                    opacity: 1,
                    blendMode: 'source-over'
                };
                return {
                    artLayers: [newLayer, ...s.artLayers],
                    activeLayerId: newLayer.id
                };
            }),

            duplicateArtLayer: (id) => set(s => {
                s.pushUndoState();
                const layerToCopy = s.artLayers.find(l => l.id === id);
                if (!layerToCopy) return s;
                const newLayer = {
                    ...layerToCopy,
                    id: uuidv4(),
                    name: `${layerToCopy.name} (Copy)`,
                    frames: { ...layerToCopy.frames },
                    zIndex: s.artLayers.length
                };
                return {
                    artLayers: [newLayer, ...s.artLayers],
                    activeLayerId: newLayer.id
                };
            }),

            updateArtLayer: (id, updates) => set(s => {
                s.pushUndoState();
                return { artLayers: s.artLayers.map(l => l.id === id ? { ...l, ...updates } : l) };
            }),

            updateArtLayerFrame: (layerId, frameIndex, dataUrl) => set(s => {
                // Nota: NO llamamos a pushUndoState aquí dentro para evitar colapsos por micro-pinceladas.
                return {
                    artLayers: s.artLayers.map(l => {
                        if (l.id === layerId) {
                            const currentFrames = l.frames || {};
                            return { ...l, frames: { ...currentFrames, [frameIndex]: dataUrl } };
                        }
                        return l;
                    })
                };
            }),

            removeArtLayer: (id) => set(s => {
                s.pushUndoState();
                return {
                    artLayers: s.artLayers.filter(l => l.id !== id),
                    activeLayerId: s.activeLayerId === id ? null : s.activeLayerId
                };
            }),

            reorderArtLayer: (id, direction) => set(s => {
                s.pushUndoState();
                const index = s.artLayers.findIndex(l => l.id === id);
                if (index < 0) return s;

                const newLayers = [...s.artLayers];
                if (direction === 'up' && index > 0) {
                    [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
                } else if (direction === 'down' && index < s.artLayers.length - 1) {
                    [newLayers[index + 1], newLayers[index]] = [newLayers[index], newLayers[index + 1]];
                }

                newLayers.forEach((l, i) => l.zIndex = newLayers.length - i);
                return { artLayers: newLayers };
            }),

            setActiveLayer: (id) => set({ activeLayerId: id })
        }),
        {
            name: 'stars-engine-art-v1',
            storage: createJSONStorage(() => ({
                getItem: async (name) => {
                    const val = await idbGet(name);
                    return val || null;
                },
                setItem: async (name, value) => {
                    await idbSet(name, value);
                },
                removeItem: async (name) => { }
            })),
            partialize: (state) => ({
                // CRÍTICO: El historial (undo/redo) NO se persiste. Protegemos la base de datos.
                artLayers: state.artLayers,
                activeLayerId: state.activeLayerId,
                timeline: state.timeline
            })
        }
    )
);