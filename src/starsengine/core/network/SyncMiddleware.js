// src/starsengine/core/network/SyncMiddleware.js
export const syncMiddleware = (config) => (set, get, api) => config(
    (args) => {
        set(args);
        const newState = get();

        // Evitamos sincronizar estados locales como el 'playState' si se desea independencia
        // Pero sincronizamos entidades y escenas para colaboración en tiempo real
        if (window.isMasterPC) {
            // Aquí se enviaría el 'newState.entities' vía WebSocket al PC 2
            // console.log("Emitiendo cambio a PC Invitado...", newState.entities);
        }
    },
    get,
    api
);