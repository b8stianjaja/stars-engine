import { useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';

export function DrawingCanvasLayer({ worker }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const lastPointRef = useRef(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#10b981');
    const [brushSize, setBrushSize] = useState(6);

    const activeViewId = useSystemicStore((state) => state.workspace.activeViewId);
    const studioMode = useSystemicStore((state) => state.workspace.studioMode);
    const cameraViews = useSystemicStore((state) => state.workspace.cameraViews);
    const canvasLayers = useSystemicStore(useShallow((state) => state.canvasLayers));
    const layerPlayback = useSystemicStore(useShallow((state) => state.layerPlayback));
    const updateLayerAssetFrame = useSystemicStore((state) => state.updateLayerAssetFrame);

    const targetView = cameraViews[activeViewId];
    // El lienzo se activa automáticamente si estamos en Diseño y sobre una cámara fija ortogonal
    const isLayerDisabled = studioMode !== 'design' || !targetView || !targetView.isFixed;

    const activeLayerKey = layerPlayback.activeLayerKey;
    const currentFrameIndex = layerPlayback.currentFrameIndex;

    useEffect(() => {
        if (isLayerDisabled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;

        // Limpieza atómica antes de restaurar el frame indexado
        context.clearRect(0, 0, canvas.width, canvas.height);

        const viewData = canvasLayers[activeViewId] || {};
        const frames = viewData[activeLayerKey] || [];
        const existingFrameData = frames[currentFrameIndex];

        if (existingFrameData) {
            const img = new Image();
            img.src = existingFrameData;
            img.onload = () => context.drawImage(img, 0, 0);
        }
    }, [isLayerDisabled, activeViewId, activeLayerKey, currentFrameIndex, canvasLayers]);

    const startDrawing = ({ nativeEvent }) => {
        if (!contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        lastPointRef.current = { x: offsetX, y: offsetY };
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing || !contextRef.current || !lastPointRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        const ctx = contextRef.current;
        const lp = lastPointRef.current;

        const mid = { x: lp.x + (offsetX - lp.x) / 2, y: lp.y + (offsetY - lp.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(lp.x, lp.y);
        ctx.quadraticCurveTo(mid.x, mid.y, offsetX, offsetY);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.stroke();

        lastPointRef.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        if (!isDrawing || !canvasRef.current) return;
        setIsDrawing(false);
        lastPointRef.current = null;

        const base64Data = canvasRef.current.toDataURL('image/png');
        // Persistencia síncrona en la matriz bound del Viewport correspondiente
        updateLayerAssetFrame(activeViewId, activeLayerKey, currentFrameIndex, base64Data);

        // Envío O(1) de la matriz de bits de colisión al Kernel Worker para procesamiento de físicas
        const res = 64;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = res; offCanvas.height = res;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(canvasRef.current, 0, 0, res, res);

        const pixels = offCtx.getImageData(0, 0, res, res).data;
        const bitmask = new Uint8Array(res * res);
        for (let i = 0; i < res * res; i++) {
            bitmask[i] = pixels[i * 4 + 3] > 20 ? 1 : 0;
        }

        if (worker) {
            worker.postMessage({
                type: 'UPDATE_CANVAS_GRID',
                payload: { viewId: activeViewId, layer: activeLayerKey, frameIndex: currentFrameIndex, resolution: res, grid: bitmask }
            });
        }
    };

    if (isLayerDisabled) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ width: '100%', height: '100%', pointerEvents: 'auto', cursor: 'crosshair' }}
            />
            {/* Flotador compacto de configuración de trazo in-viewport */}
            <div style={{ position: 'absolute', top: 12, right: 12, background: '#050508f0', padding: '6px', borderRadius: '4px', border: '1px solid #ff00aa33', display: 'flex', gap: '8px', alignItems: 'center', pointerEvents: 'auto', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: '8px', color: '#ff00aa', fontFamily: 'monospace', fontWeight: 'bold' }}>BRUSH_CTRL:</span>
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} style={{ background: 'transparent', border: 'none', width: '20px', height: '16px', cursor: 'pointer', padding: 0 }} />
                <input type="range" min="2" max="24" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={{ width: '60px', accentColor: '#ff00aa', height: '3px' }} />
            </div>
        </div>
    );
}