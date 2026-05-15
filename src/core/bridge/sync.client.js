import { io } from 'socket.io-client';
import { useSystemicStore } from '../engine.store';

/**
 * Sync Client: Gestiona el Broadcast de Cambios[cite: 29].
 */
export const initSyncClient = (worker) => {
    const socket = io('http://localhost:3000'); // Servidor local integrado [cite: 23]
    const applyPatch = useSystemicStore.getState().applyPatch;

    socket.on('SYNC_ASSET', (data) => {
        console.log("[LHC]: Hot-Swapping de textura detectado [cite: 30]");
        // Actualizamos el hash en el Store para que el Viewport reaccione
        applyPatch({ [data.entityId]: { textureHash: data.newHash } });
    });

    socket.on('SYNC_SCRIPT', (data) => {
        // Envía el código al Logic Worker para su reinyección en caliente 
        worker.postMessage({ type: 'INJECT_SCRIPT', payload: data.code });
    });

    return socket;
};