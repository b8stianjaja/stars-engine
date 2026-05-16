import { useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';

export function DrawingCanvasLayer() {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const lastPointRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const activeViewId = useSystemicStore((state) => state.workspace.activeViewId);
    const studioMode = useSystemicStore((state) => state.workspace.studioMode);
    const canvasLayers = useSystemicStore(useShallow((state) => state.canvasLayers));
    const layerPlayback = useSystemicStore(useShallow((state) => state.layerPlayback));
    const updateLayerAssetFrame = useSystemicStore((state) => state.updateLayerAssetFrame);

    const { paintMode, activeLayerKey, currentFrameIndex, brushColor, brushSize } = layerPlayback;
    const isLayerDisabled = studioMode !== 'design' || !paintMode;

    useEffect(() => {
        if (isLayerDisabled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;

        // Limpieza y restauración del fotograma activo de la cámara actual
        context.clearRect(0, 0, canvas.width, canvas.height);
        const currentViewData = canvasLayers[activeViewId] || {};
        const layerFrames = currentViewData[activeLayerKey] || [];
        const savedFrameData = layerFrames[currentFrameIndex];

        if (savedFrameData) {
            const img = new Image();
            img.src = savedFrameData;
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
        updateLayerAssetFrame(activeViewId, activeLayerKey, currentFrameIndex, base64Data);
    };

    if (isLayerDisabled) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: '320px', width: 'calc(100vw - 320px)', height: '100vh', pointerEvents: 'none', zIndex: 50 }}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ width: '100%', height: '100%', pointerEvents: 'auto', cursor: 'crosshair' }}
            />
            <div style={{ position: 'absolute', top: 12, right: 12, background: '#050508f0', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ff00aa', display: 'flex', gap: '8px', alignItems: 'center', pointerEvents: 'auto', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff00aa', animate: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: '9px', color: '#ff00aa', fontFamily: 'monospace', fontWeight: 'bold' }}>CANVAS_OVERLAY_ACTIVE</span>
                </div>
                <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace' }}>|</span>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase' }}>LAYER: {activeLayerKey} (F_{currentFrameIndex})</span>
            </div>
        </div>
    );
}