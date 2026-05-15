import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export const useUIStore = create(
    persist(
        (set) => ({
            workspaceMode: 'artist', // 'artist' | 'dev'
            uiTheme: 'light', // 'light' | 'dark'

            studioView: { x: 0, y: 0, zoom: 0.5, showGreybox: true },

            studioTools: {
                active: 'pencil', // Options: 'pencil', 'eraser', 'bucket', 'pipette', 'selection'
                color: '#00ffcc',
                size: 5,
                opacity: 1,
                symmetryX: false,
                showGrid2D: false,
                selectionActive: false,
                isEditingSprite: false, // NEW: Tracks if the pixel editor is intentionally open
            },

            notifications: [],

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
                notifications: [{ id: crypto.randomUUID(), msg, time: Date.now() }, ...state.notifications].slice(0, 5)
            }))
        }),
        {
            name: 'stars-engine-ui-v1',
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
                workspaceMode: state.workspaceMode,
                uiTheme: state.uiTheme,
                studioTools: state.studioTools
            })
        }
    )
);