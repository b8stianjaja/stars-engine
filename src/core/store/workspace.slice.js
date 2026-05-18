// src/core/store/workspace.slice.js

export const createWorkspaceSlice = (set) => ({
    workspace: {
        studioMode: 'design', // 'design' | 'logic' | 'play'
        selectedEntityId: null,
        showBlueprints: true,
        transformMode: 'translate',
        snapValue: 0.5,
        cameraLocked: false,
        directorCameraData: null // { position: [x,y,z], quaternion: [x,y,z,w] }
    },

    layerPlayback: {
        paintMode: false,
        activeLayerKey: 'midground',
        brushColor: '#0071e3',
        brushSize: 4,
        opacityGuide: 0.5
    },

    // --- MUTADORES DE WORKSPACE ---
    setStudioMode: (mode) => set((state) => ({ workspace: { ...state.workspace, studioMode: mode } })),
    toggleBlueprints: () => set((state) => ({ workspace: { ...state.workspace, showBlueprints: !state.workspace.showBlueprints } })),
    selectEntity: (id) => set((state) => ({ workspace: { ...state.workspace, selectedEntityId: id } })),
    setTransformMode: (mode) => set((state) => ({ workspace: { ...state.workspace, transformMode: mode } })),
    setSnapValue: (val) => set((state) => ({ workspace: { ...state.workspace, snapValue: val } })),

    // --- MUTADORES DE CÁMARA DE DIRECTOR ---
    toggleCameraLock: () => set((state) => ({ workspace: { ...state.workspace, cameraLocked: !state.workspace.cameraLocked } })),
    saveDirectorCamera: (position, quaternion) => set((state) => ({
        workspace: { ...state.workspace, directorCameraData: { position, quaternion } }
    })),

    // --- MUTADORES DE ILUSTRACIÓN ---
    setPaintMode: (active) => set((state) => ({ layerPlayback: { ...state.layerPlayback, paintMode: active } })),
    setBrushColor: (color) => set((state) => ({ layerPlayback: { ...state.layerPlayback, brushColor: color } })),
    setBrushSize: (size) => set((state) => ({ layerPlayback: { ...state.layerPlayback, brushSize: size } })),
    setActiveLayerKey: (key) => set((state) => ({ layerPlayback: { ...state.layerPlayback, activeLayerKey: key } }))
});