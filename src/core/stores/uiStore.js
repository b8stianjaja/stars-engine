import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export const useUIStore = create(
    persist(
        (set) => ({
            // --- ESTADO LOCAL DE LA INTERFAZ ---
            workspaceMode: 'artist', // 'artist' | 'dev'
            uiTheme: 'light', // 'light' | 'dark'

            studioView: { x: 0, y: 0, zoom: 0.5, showGreybox: true },

            studioTools: {
                active: 'pencil', // 'pencil' | 'eraser' | 'pan' | 'bucket' | 'pipette'
                color: '#f8fafc',
                size: 5,
                opacity: 1,
                symmetryX: false,
                showGrid2D: false
            },

            notifications: [],

            // --- ACCIONES ---
            toggleWorkspaceMode: () => set(state => ({
                workspaceMode: state.workspaceMode === 'artist' ? 'dev' : 'artist'
            })),

            toggleTheme: () => set(state => ({
                uiTheme: state.uiTheme === 'light' ? 'dark' : 'light'
            })),

            setStudioView: (viewUpdates) => set(state => ({
                studioView: { ...state.studioView, ...viewUpdates }
            })),

            setStudioTool: (toolUpdates) => set(state => ({
                studioTools: { ...state.studioTools, ...toolUpdates }
            })),

            addNotification: (msg) => set(state => ({
                // Usamos crypto.randomUUID() nativo del navegador en lugar de la librería uuid
                notifications: [{ id: crypto.randomUUID(), msg, time: Date.now() }, ...state.notifications].slice(0, 5)
            }))
        }),
        {
            name: 'stars-engine-ui-v1', // Nueva llave independiente en IndexedDB
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
            // CRÍTICO: Solo persistimos lo que realmente importa al recargar la página.
            // No guardamos el `studioView` (zoom/pan) para evitar re-escrituras constantes en la base de datos al mover el mouse.
            partialize: (state) => ({
                workspaceMode: state.workspaceMode,
                uiTheme: state.uiTheme,
                studioTools: state.studioTools
            })
        }
    )
);