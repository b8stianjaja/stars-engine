import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';

export function TelemetryHUD({ worker }) {
    const [metrics, setMetrics] = useState({ fps: 0, delta: 0, workerLoad: 0 });

    // Regla de Oro #1: Estabilidad de Selectores [cite: 56]
    const entityCount = useSystemicStore(
        useShallow((state) => Object.keys(state.entities).length)
    );

    useEffect(() => {
        const handleMessage = (e) => {
            if (e.data.type === 'TELEMETRY_DATA') {
                setMetrics(e.data.payload);
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);

    return (
        <div style={{
            position: 'absolute', top: 20, left: 20,
            color: '#00ff00', fontFamily: '"Fira Code", monospace',
            fontSize: '11px', pointerEvents: 'none',
            background: 'rgba(0,0,0,0.5)', padding: '10px',
            borderLeft: '2px solid #00ff00', zIndex: 100
        }}>
            <div>STARS_ENGINE_V1.0.0-PRO</div>
            <div style={{ opacity: 0.5 }}>--- KERNEL_STATS ---</div>
            <div>TICK_RATE: 60Hz (SYNC) [cite: 40]</div>
            <div>ENTITIES: {entityCount}</div>
            <div>WORKER_LOAD: {metrics.workerLoad.toFixed(2)}ms</div>
            <div style={{ marginTop: '5px', color: metrics.fps < 58 ? '#ff0055' : '#00ff00' }}>
                VIEWPORT_FPS: {Math.round(metrics.fps)}
            </div>
        </div>
    );
}