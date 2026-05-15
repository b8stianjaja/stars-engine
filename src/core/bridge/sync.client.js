import { io } from 'socket.io-client';
import { useSystemicStore } from '../engine.store';

// Mantenemos una referencia global al socket para envíos desde los componentes
let globalSocket = null;

export const initSyncClient = (worker) => {
    globalSocket = io('http://localhost:3001');
    const applyPatch = useSystemicStore.getState().applyPatch;

    globalSocket.on('SYNC_ASSET', (data) => {
        applyPatch({ [data.entityId]: { textureHash: data.newHash } });
    });

    globalSocket.on('SYNC_SCRIPT', (data) => {
        worker.postMessage({ type: 'INJECT_SCRIPT', payload: data.code });
    });

    return globalSocket;
};

// Utilidad para que el Actor o el Editor puedan emitir eventos a la LAN
export const emitSyncEvent = (eventName, payload) => {
    if (globalSocket && globalSocket.connected) {
        globalSocket.emit(eventName, payload);
    } else {
        console.warn(`[Sync Client]: Intento de emitir '${eventName}' sin conexión.`);
    }
};