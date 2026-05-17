import { io } from 'socket.io-client';
import { useSystemicStore } from '../engine.store';

let globalSocket = null;

export const initSyncClient = (worker) => {
    const store = useSystemicStore.getState();

    if (globalSocket) {
        globalSocket.disconnect();
    }

    globalSocket = io(store.collaboration.serverUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true
    });

    globalSocket.on('connect', () => {
        store.setConnectionStatus(true);
        console.log(`[Sync Client] Conectado exitosamente al servidor de sincronización LAN: ${store.collaboration.serverUrl}`);

        // Medidor de latencia activa (Heartbeat)
        setInterval(() => {
            const start = Date.now();
            globalSocket.emit('NET_PING', () => {
                const duration = Date.now() - start;
                store.setLatency(duration);
            });
        }, 2000);
    });

    globalSocket.on('disconnect', () => {
        store.setConnectionStatus(false);
        store.setLatency(0);
        console.warn('[Sync Client] Conexión perdida con el servidor LAN.');
    });

    // --- PIPELINE DE EVENTOS REMOTOS RECIBIDOS ---
    globalSocket.on('SERVER_ENTITY_CREATE', (data) => {
        store.registerEntity(data.id, data.payload, true);
        if (worker) {
            worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: data.id, ...data.payload } });
        }
    });

    globalSocket.on('SERVER_ENTITY_DELETE', (data) => {
        store.removeEntity(data.id, true);
        if (worker) {
            worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id: data.id } });
        }
    });

    globalSocket.on('SERVER_ENTITY_TRANSFORM', (data) => {
        store.updateEntityTransform(data.id, data.field, data.value, true);
        if (worker && data.field === 'position') {
            worker.postMessage({
                type: 'UPDATE_PHYSICAL_POS',
                payload: { id: data.id, x: data.value[0], y: data.value[1], z: data.value[2] }
            });
        }
    });

    globalSocket.on('SERVER_ENTITY_SCRIPT', (data) => {
        store.updateEntityScript(data.id, data.code, true);
        if (worker) {
            worker.postMessage({ type: 'INJECT_SCRIPT', payload: { id: data.id, code: data.code } });
        }
    });

    globalSocket.on('SERVER_ENTITY_PROPERTY', (data) => {
        store.updateEntityProperty(data.id, data.key, data.value, true);
        if (worker) {
            worker.postMessage({
                type: 'UPDATE_ENTITY_PROPERTIES',
                payload: { id: data.id, properties: { [data.key]: data.value } }
            });
        }
    });

    return globalSocket;
};

export const emitSyncEvent = (eventName, payload) => {
    if (globalSocket && globalSocket.connected) {
        globalSocket.emit(eventName, payload);
    }
};