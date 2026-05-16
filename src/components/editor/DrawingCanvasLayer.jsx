import { useEffect, useRef } from 'react';
import { useSystemicStore } from '../../core/engine.store';

export function DrawingCanvasLayer({ targetLayer }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const paintMode = useSystemicStore(state => state.layerPlayback.paintMode);
    const activeLayerKey = useSystemicStore(state => state.layerPlayback.activeLayerKey);

    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                const dpr = window.devicePixelRatio || 1;

                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width || 1, canvas.height || 1);

                canvas.width = width * dpr;
                canvas.height = height * dpr;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;

                ctx.scale(dpr, dpr);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (canvas.width > 1) ctx.putImageData(imageData, 0, 0);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas || !paintMode || activeLayerKey !== targetLayer) return;

        const getPointerPos = (e) => {
            const rect = container.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 1 };
        };

        const onPointerDown = (e) => {
            if (e.button !== 0) return;
            isDrawing.current = true;
            lastPos.current = getPointerPos(e);
        };

        const onPointerMove = (e) => {
            if (!isDrawing.current) return;
            const ctx = canvas.getContext('2d');
            const { brushColor, brushSize } = useSystemicStore.getState().layerPlayback;
            const currentPos = getPointerPos(e);

            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize * currentPos.pressure;
            ctx.stroke();

            lastPos.current = currentPos;
        };

        const onPointerUp = () => { isDrawing.current = false; };

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [paintMode, activeLayerKey, targetLayer]);

    const isActive = activeLayerKey === targetLayer;

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%', height: '100%', position: 'relative',
                pointerEvents: (paintMode && isActive) ? 'auto' : 'none',
                cursor: (paintMode && isActive) ? 'crosshair' : 'default'
            }}
        >
            <canvas
                id={`canvas-${targetLayer}`} // CRÍTICO PARA LA SERIALIZACIÓN
                ref={canvasRef}
                style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none', transition: 'opacity 0.2s ease',
                    opacity: (paintMode && !isActive) ? 0.3 : 1
                }}
            />
        </div>
    );
}