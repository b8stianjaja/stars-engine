// src/starsengine/core/logic/DrawingSystem.js
export const DrawingSystem = {
    // Mapa de contextos de dibujo para cada entidad
    canvases: new Map(),

    getCanvas(entityId, size = 1024) {
        if (!this.canvases.has(entityId)) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            // Fondo transparente por defecto
            ctx.clearRect(0, 0, size, size);
            this.canvases.set(entityId, { canvas, ctx });
        }
        return this.canvases.get(entityId);
    },

    paintStroke(entityId, strokeData) {
        const { ctx, canvas } = this.getCanvas(entityId);
        const { points, brush } = strokeData;

        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = brush.color;
        ctx.lineWidth = brush.size;
        ctx.globalAlpha = brush.opacity;

        points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Notificar al renderizador que la textura cambió
        return canvas;
    }
};