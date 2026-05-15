// src/starsengine/core/logic/DrawingManager.js
import { DrawingSystem } from './DrawingSystem';
import { network } from '../network/NetworkManager';

class DrawingManager {
    constructor() {
        this.isDrawing = false;
        this.currentStroke = [];
        this.activeEntityId = null;
        this.brush = {
            color: '#ffffff',
            size: 5,
            opacity: 1.0
        };
    }

    startStroke(entityId, uv) {
        this.isDrawing = true;
        this.activeEntityId = entityId;
        this.currentStroke = [{ x: uv.x * 1024, y: (1 - uv.y) * 1024 }];
    }

    continueStroke(uv) {
        if (!this.isDrawing) return;

        const point = { x: uv.x * 1024, y: (1 - uv.y) * 1024 };
        this.currentStroke.push(point);

        // Dibujo local inmediato para feedback visual
        DrawingSystem.paintStroke(this.activeEntityId, {
            points: [this.currentStroke[this.currentStroke.length - 2], point],
            brush: this.brush
        });

        // Notificar al renderizador local
        window.dispatchEvent(new CustomEvent(`draw-update-${this.activeEntityId}`));
    }

    endStroke() {
        if (!this.isDrawing) return;

        // Enviar el trazo completo por la red al Programador
        network.sendStroke(this.activeEntityId, {
            points: this.currentStroke,
            brush: this.brush
        });

        this.isDrawing = false;
        this.currentStroke = [];
    }

    setBrush(settings) {
        this.brush = { ...this.brush, ...settings };
    }
}

export const drawingManager = new DrawingManager();