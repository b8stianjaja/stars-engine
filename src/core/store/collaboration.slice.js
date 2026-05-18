// src/core/store/collaboration.slice.js

export const createCollaborationSlice = (set) => ({
    collaboration: {
        isConnected: false,
        localRole: 'artist', // 'artist' | 'developer'
        serverUrl: 'http://localhost:3001',
        latency: 0,
        roomCode: 'LAN-SESSION'
    },

    // --- MUTADORES DE RED ---
    setConnectionStatus: (connected) => set((state) => ({
        collaboration: { ...state.collaboration, isConnected: connected }
    })),
    setLatency: (ms) => set((state) => ({
        collaboration: { ...state.collaboration, latency: ms }
    })),
    setServerUrl: (url) => set((state) => ({
        collaboration: { ...state.collaboration, serverUrl: url }
    })),

    // Mutador de rol acoplado a la UI (Cambia el rol de red y el modo del workspace simultáneamente)
    setLocalRole: (role) => set((state) => {
        const modeMapping = role === 'artist' ? 'design' : 'logic';
        return {
            collaboration: { ...state.collaboration, localRole: role },
            workspace: { ...state.workspace, studioMode: modeMapping }
        };
    })
});