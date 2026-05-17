import { useEffect, useState, useRef } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';

export function TelemetryHUD() {
    const { totalEntities, freeIndicesCount, studioMode } = useSystemicStore(
        useShallow(state => ({
            totalEntities: Object.keys(state.entities).length,
            freeIndicesCount: state.freeIndices.length,
            studioMode: state.workspace.studioMode
        }))
    );

    const [fps, setFps] = useState(60);
    const frameCount = useRef(0);
    const lastFpsUpdate = useRef(performance.now());

    // Loop de cálculo continuo de FPS sin alterar el ciclo atómico de R3F
    useEffect(() => {
        let animationFrameId;

        const calculateFps = () => {
            frameCount.current += 1;
            const now = performance.now();
            const delta = now - lastFpsUpdate.current;

            if (delta >= 1000) {
                setFps(Math.round((frameCount.current * 1000) / delta));
                frameCount.current = 0;
                lastFpsUpdate.current = now;
            }

            animationFrameId = requestAnimationFrame(calculateFps);
        };

        animationFrameId = requestAnimationFrame(calculateFps);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const MAX_ENTITIES = 2000;
    const memoryUsedBytes = totalEntities * 16 * 4; // 16 floats por entidad * 4 bytes por float
    const totalMemoryBytes = MAX_ENTITIES * 16 * 4;
    const memoryPercentage = ((memoryUsedBytes / totalMemoryBytes) * 100).toFixed(2);

    const containerStyle = {
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'rgba(10, 10, 12, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '6px',
        padding: '12px',
        width: '220px',
        fontFamily: '"SF Mono", "Fira Code", Menlo, monospace',
        fontSize: '11px',
        color: '#86868b',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        pointerEvents: 'none',
        zIndex: 50,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        userSelect: 'none'
    };

    const rowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const valueStyle = (color = '#f5f5f7') => ({
        color: color,
        fontWeight: '600'
    });

    return (
        <div style={containerStyle}>
            <div style={{ ...rowStyle, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700', color: 'var(--accent, #0071e3)' }}>HAL METRICS</span>
                <span style={valueStyle(fps < 45 ? '#ff3b30' : '#34c759')}>{fps} FPS</span>
            </div>

            <div style={rowStyle}>
                <span>Modo Activo:</span>
                <span style={valueStyle('#0071e3')}>{studioMode.toUpperCase()}</span>
            </div>

            <div style={rowStyle}>
                <span>Entidades:</span>
                <span style={valueStyle()}>{totalEntities} / {MAX_ENTITIES}</span>
            </div>

            <div style={rowStyle}>
                <span>Stack Libres:</span>
                <span style={valueStyle()}>{freeIndicesCount}</span>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '2px 0' }} />

            <div style={rowStyle}>
                <span>VRAM Compartida:</span>
                <span style={valueStyle()}>{memoryPercentage}%</span>
            </div>

            {/* Barra de progreso de asignación de hardware */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                <div style={{ width: `${memoryPercentage}%`, height: '100%', background: parseFloat(memoryPercentage) > 85 ? '#ff3b30' : 'var(--accent, #0071e3)', transition: 'width 0.3s ease' }} />
            </div>

            <div style={{ ...rowStyle, fontSize: '9px', marginTop: '2px', color: '#444446' }}>
                <span>Heap: {memoryUsedBytes} B</span>
                <span>Max: {(totalMemoryBytes / 1024).toFixed(1)} KB</span>
            </div>
        </div>
    );
}