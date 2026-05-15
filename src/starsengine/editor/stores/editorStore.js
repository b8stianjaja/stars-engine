import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export const useEditorStore = create(
    persist(
        (set) => ({
            // Modos de Trabajo
            workspaceMode: 'artist', // 'artist' | 'dev'
            uiTheme: 'dark',

            // Selección y Transformación
            selectedEntityId: null,
            transformMode: 'translate', // 'translate' | 'rotate' | 'scale'

            // Estado de Cámara e Hibridación
            cameraProjection: 'perspective', // 'perspective' | 'orthographic'
            isTransforming: false,
            isDraggingCamera: false,
            isCameraLocked: false,

            // Acciones
            setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
            toggleTheme: () => set(state => ({ uiTheme: state.uiTheme === 'light' ? 'dark' : 'light' })),

            setSelectedEntity: (id) => set({ selectedEntityId: id }),
            setTransformMode: (mode) => set({ transformMode: mode }),

            setCameraProjection: (projection) => set({ cameraProjection: projection }),
            toggleCameraProjection: () => set(state => ({
                cameraProjection: state.cameraProjection === 'perspective' ? 'orthographic' : 'perspective'
            })),

            setIsTransforming: (val) => set({ isTransforming: val }),
            setIsDraggingCamera: (val) => set({ isDraggingCamera: val }),
            toggleCameraLock: () => set(state => ({ isCameraLocked: !state.isCameraLocked }))
        }),
        {
            name: 'stars-engine-editor',
            storage: createJSONStorage(() => ({
                getItem: async (name) => await idbGet(name),
                setItem: async (name, value) => await idbSet(name, value),
                removeItem: async (name) => await idbDel(name)
            })),
            partialize: (state) => ({
                workspaceMode: state.workspaceMode,
                uiTheme: state.uiTheme,
                cameraProjection: state.cameraProjection
            })
        }
    )
);