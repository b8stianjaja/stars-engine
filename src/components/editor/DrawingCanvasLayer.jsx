import { useRef, useEffect, useState } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { emitSyncEvent } from '../../core/bridge/sync.client';

export function DrawingCanvasLayer() {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#10b981'); // Esmeralda por defecto
    const [brushSize, setBrushSize] = useState(8);
    const [activeLayer, setActiveLayer] = useState('foreground'); // foreground o background

    const activeViewId = useSystemicStore((state) => state.workspace.activeViewId);
    const updateLayerAsset = useSystemicStore((state) => state.updateLayerAsset);

    // Si estamos en Cámara Libre, el lienzo se desactiva por completo para dejar trabajar al desarrollador
    const isFreeCamera = activeViewId === 'free';

    useEffect(() => {
        if (isFreeCamera || !canvasRef.current) return;

        const canvas = canvasRef.current;
        // Ajustamos la resolución interna al tamaño real del contenedor de la GPU
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;
    }, [isFreeCamera, activeViewId]);

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

        // Emitimos el trazo en tiempo real por la LAN (Socket.io)
        emitSyncEvent('ARTIST_STROKE', {
            viewId: activeViewId,
            layer: activeLayer,
            x: offsetX,
            y: offsetY,
            color: brushColor,
            size: brushSize
        });
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (!contextRef.current || !canvasRef.current) return;
        contextRef.current.closePath();

        // Al levantar el pincel, guardamos el estado del lienzo en la estructura del Workspace
        const base64Data = canvasRef.current.toDataURL('image/png');
        updateLayerAsset(activeLayer, base64Data);
    };

    const clearCanvas = () => {
        if (!contextRef.current || !canvasRef.current) return;
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        updateLayerAsset(activeLayer, null);
    };

    const saveLayerToDisk = () => {
        if (!canvasRef.current) return;
        const base64Data = canvasRef.current.toDataURL('image/png');
        // Persistencia nativa asíncrona en disco rígido mediante Tauri
        emitSyncEvent('SAVE_CANVAS', {
            entityId: `layer_${activeViewId}_${activeLayer}`,
            imageData: base64Data
        });
        console.log(`[Stars IDE]: Solicitud de persistencia nativa enviada para la capa: ${activeLayer}`);
    };

    if (isFreeCamera) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
            {/* Canvas Interactivo de Ilustración */}
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ width: '100%', height: '100%', pointerEvents: 'auto', cursor: 'crosshair', position: 'absolute', top: 0, left: 0 }}
            />

            {/* Caja de Herramientas Flotante del Artista (HUD flotante sobre el canvas) */}
            <div style={{
                position: 'absolute', bottom: 20, right: 20, background: '#09090dd0', padding: '12px',
                borderRadius: '6px', border: '1px solid #1a1a26', display: 'flex', gap: '12px',
                alignItems: 'center', pointerEvents: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
            }}>
                {/* Selector de Capas */}
                <select
                    value={activeLayer}
                    onChange={(e) => setActiveLayer(e.target.value)}
                    style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}
                >
                    <option value="foreground">Capa Frente (Overlay)</option>
                    <option value="background">Capa Fondo (Underlay)</option>
                </select>

                {/* Selector de Color del Pincel */}
                <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '28px', height: '24px', cursor: 'pointer' }}
                />

                {/* Control de Grosor */}
                <input
                    type="range" min="2" max="32"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    style={{ width: '80px', accentColor: '#6366f1' }}
                />

                {/* Acciones de Limpieza y Persistencia */}
                <button onClick={clearCanvas} style={{ background: '#222', border: 'none', color: '#aaa', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                    Limpiar
                </button>
                <button onClick={saveLayerToDisk} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Exportar PNG
                </button>
            </div>
        </div>
    );
}