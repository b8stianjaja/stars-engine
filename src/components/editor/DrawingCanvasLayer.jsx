import { useRef, useEffect, useState } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { emitSyncEvent } from '../../core/bridge/sync.client';

export function DrawingCanvasLayer({ worker }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const lastPointRef = useRef(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#10b981');
    const [brushSize, setBrushSize] = useState(6);
    const [activeLayer, setActiveLayer] = useState('foreground');
    const [currentFrame, setCurrentFrame] = useState(0);

    const activeViewId = useSystemicStore((state) => state.workspace.activeViewId);
    const studioMode = useSystemicStore((state) => state.workspace.studioMode);
    const canvasLayers = useSystemicStore((state) => state.canvasLayers);
    const updateLayerAsset = useSystemicStore((state) => state.updateLayerAsset);

    // AISLAMIENTO RADICAL: El pincel se bloquea por completo a menos que estemos en el plano cenital ortogonal dedicado
    const isLayerDisabled = activeViewId !== 'paint_canvas' || studioMode !== 'design';

    useEffect(() => {
        if (isLayerDisabled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const context = canvas.getContext('2d');
        context.lineCap = 'round'; context.lineJoin = 'round';
        contextRef.current = context;

        const layerKey = `${activeLayer}_f${currentFrame}`;
        const existingData = canvasLayers[layerKey];
        if (existingData) {
            const img = new Image();
            img.src = existingData;
            img.onload = () => context.drawImage(img, 0, 0);
        }
    }, [isLayerDisabled, activeViewId, activeLayer, currentFrame]);

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
        ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.quadraticCurveTo(mid.x, mid.y, offsetX, offsetY);
        ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize; ctx.stroke();

        lastPointRef.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        if (!isDrawing || !canvasRef.current) return;
        setIsDrawing(false);
        lastPointRef.current = null;

        const base64Data = canvasRef.current.toDataURL('image/png');
        const layerKey = `${activeLayer}_f${currentFrame}`;
        updateLayerAsset(layerKey, base64Data);

        // Procesamiento e inyección O(1) de matriz binaria al Worker
        const res = 64;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = res; offCanvas.height = res;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(canvasRef.current, 0, 0, res, res);

        const pixels = offCtx.getImageData(0, 0, res, res).data;
        const bitmask = new Uint8Array(res * res);
        for (let i = 0; i < res * res; i++) bitmask[i] = pixels[i * 4 + 3] > 20 ? 1 : 0;

        if (worker) {
            worker.postMessage({ type: 'UPDATE_CANVAS_GRID', payload: { layer: activeLayer, frameIndex: currentFrame, resolution: res, grid: bitmask } });
        }
    };

    if (isLayerDisabled) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
            <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} style={{ width: '100%', height: '100%', pointerEvents: 'auto', cursor: 'crosshair' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, background: '#09090c', padding: '10px', borderRadius: '4px', border: '1px solid #161622', display: 'flex', gap: '12px', alignItems: 'center', pointerEvents: 'auto' }}>
                <select value={activeLayer} onChange={(e) => setActiveLayer(e.target.value)} style={{ background: '#050508', color: '#fff', border: '1px solid #1c1c24', padding: '4px', fontSize: '10px', fontFamily: 'monospace' }}>
                    <option value="foreground">FOREGROUND_WALLS</option>
                    <option value="background">BACKGROUND_TRIGGERS</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#050508', border: '1px solid #1c1c24', padding: '2px', borderRadius: '3px' }}>
                    <button onClick={() => setCurrentFrame(p => Math.max(0, p - 1))} style={{ background: 'transparent', border: 'none', color: '#ff00aa', cursor: 'pointer', fontSize: '10px' }}>&lt;</button>
                    <span style={{ fontSize: '10px', color: '#fff', fontFamily: 'monospace' }}>FRAME_{currentFrame}</span>
                    <button onClick={() => setCurrentFrame(p => Math.min(15, p + 1))} style={{ background: 'transparent', border: 'none', color: '#ff00aa', cursor: 'pointer', fontSize: '10px' }}>&gt;</button>
                </div>
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} style={{ background: 'transparent', border: 'none', width: '22px', height: '20px', cursor: 'pointer' }} />
            </div>
        </div>
    );
}