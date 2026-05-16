import { useRef, useEffect, useState } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { emitSyncEvent } from '../../core/bridge/sync.client';

export function DrawingCanvasLayer({ worker }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#10b981');
    const [brushSize, setBrushSize] = useState(8);
    const [activeLayer, setActiveLayer] = useState('foreground');

    const activeViewId = useSystemicStore((state) => state.workspace.activeViewId);
    const studioMode = useSystemicStore((state) => state.workspace.studioMode);
    const updateLayerAsset = useSystemicStore((state) => state.updateLayerAsset);

    // AISLAMIENTO INTEGRAL: El lienzo se desactiva por completo en Cámara Libre o si entramos al Developer Studio
    const isLayerDisabled = activeViewId === 'free' || studioMode !== 'artist';

    useEffect(() => {
        if (isLayerDisabled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;
    }, [isLayerDisabled, activeViewId]);

    const startDrawing = ({ nativeEvent }) => {
        if (!contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;

        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        contextRef.current.strokeStyle = brushColor;
        contextRef.current.lineWidth = brushSize;
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing || !contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;

        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();

        emitSyncEvent('ARTIST_STROKE', {
            viewId: activeViewId,
            layer: activeLayer,
            x: offsetX,
            y: offsetY,
            color: brushColor,
            size: brushSize
        });
    };

    const dispatchPhysicsBitmask = () => {
        if (!canvasRef.current) return;

        const mainCanvas = canvasRef.current;
        const resolution = 64;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = resolution;
        offscreenCanvas.height = resolution;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        offscreenCtx.drawImage(mainCanvas, 0, 0, resolution, resolution);
        const imgData = offscreenCtx.getImageData(0, 0, resolution, resolution);
        const pixelBuffer = imgData.data;

        const bitmask = new Uint8Array(resolution * resolution);
        for (let i = 0; i < resolution * resolution; i++) {
            const alphaIndex = i * 4 + 3;
            bitmask[i] = pixelBuffer[alphaIndex] > 15 ? 1 : 0;
        }

        if (worker) {
            worker.postMessage({
                type: 'UPDATE_CANVAS_GRID',
                payload: {
                    layer: activeLayer,
                    resolution: resolution,
                    grid: bitmask
                }
            });
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (!contextRef.current || !canvasRef.current) return;
        contextRef.current.closePath();

        const base64Data = canvasRef.current.toDataURL('image/png');
        updateLayerAsset(activeLayer, base64Data);

        dispatchPhysicsBitmask();
    };

    const clearCanvas = () => {
        if (!contextRef.current || !canvasRef.current) return;
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        updateLayerAsset(activeLayer, null);

        if (worker) {
            worker.postMessage({
                type: 'UPDATE_CANVAS_GRID',
                payload: { layer: activeLayer, resolution: 64, grid: new Uint8Array(64 * 64) }
            });
        }
    };

    const saveLayerToDisk = () => {
        if (!canvasRef.current) return;
        const base64Data = canvasRef.current.toDataURL('image/png');
        emitSyncEvent('SAVE_CANVAS', {
            entityId: `layer_${activeViewId}_${activeLayer}`,
            imageData: base64Data
        });
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
                style={{ width: '100%', height: '100%', pointerEvents: 'auto', cursor: 'crosshair', position: 'absolute', top: 0, left: 0 }}
            />

            <div style={{
                position: 'absolute', bottom: 20, right: 20, background: '#09090dd0', padding: '12px',
                borderRadius: '6px', border: '1px solid #1a1a26', display: 'flex', gap: '12px',
                alignItems: 'center', pointerEvents: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
            }}>
                <select
                    value={activeLayer}
                    onChange={(e) => setActiveLayer(e.target.value)}
                    style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}
                >
                    <option value="foreground">Capa Frente (Muros Físicos)</option>
                    <option value="background">Capa Fondo (Zonas de Ruta/Trigger)</option>
                </select>

                <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '28px', height: '24px', cursor: 'pointer' }}
                />

                <input
                    type="range" min="2" max="32"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    style={{ width: '80px', accentColor: '#ff00aa' }}
                />

                <button onClick={clearCanvas} style={{ background: '#222', border: 'none', color: '#aaa', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                    Limpiar
                </button>
                <button onClick={saveLayerToDisk} style={{ background: '#ff00aa', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Exportar PNG
                </button>
            </div>
        </div>
    );
}