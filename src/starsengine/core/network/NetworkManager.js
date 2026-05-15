// src/starsengine/core/network/NetworkManager.js
import { io } from "socket.io-client";
import { useEngineStore } from "../stores/engineStore";
import { DrawingSystem } from "../logic/DrawingSystem";

class NetworkManager {
    constructor() {
        this.socket = null;
    }

    /**
     * Conecta al servidor de sincronización (Bridge).
     * @param {string} ip - La IP del PC principal donde corre sync-server.cjs
     */
    connect(ip) {
        if (this.socket) return;

        this.socket = io(`http://${ip}:3001`);

        this.socket.on("connect", () => {
            console.log("Conectado al Stars Engine Sync Bridge");
        });

        // RECEPTOR: Cuando el artista dibuja, el programador recibe el trazo
        this.socket.on("REMOTE_STROKE", (data) => {
            const { entityId, stroke } = data;
            DrawingSystem.paintStroke(entityId, stroke);
            // Notificamos al Viewport local para refrescar la textura
            window.dispatchEvent(new CustomEvent(`draw-update-${entityId}`));
        });

        // RECEPTOR: Cuando el programador cambia lógica o entidades, el artista se actualiza
        this.socket.on("REMOTE_ENGINE_UPDATE", (data) => {
            useEngineStore.setState({ entities: data.entities });
        });
    }

    /**
     * Emite un trazo de dibujo a la red (Usado por el Artista)
     */
    sendStroke(entityId, stroke) {
        if (this.socket) {
            this.socket.emit("ARTIST_STROKE", { entityId, stroke });
        }
    }

    /**
     * Emite el estado de las entidades a la red (Usado por el Programador)
     */
    sendEngineUpdate(entities) {
        if (this.socket) {
            this.socket.emit("ENGINE_UPDATE", { entities });
        }
    }
}

export const network = new NetworkManager();