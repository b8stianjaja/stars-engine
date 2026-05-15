import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';

export function TelemetryHUD({ worker }) {
    const [metrics, setMetrics] = useState({ fps: 60, delta: 16.6, workerLoad: 0 });
    const entityCount = useSystemicStore(useShallow((state) => Object.keys(state.entities).length));

    useEffect(() => {
        if (!worker) return;
        const handleMessage = (e) => {
            if (e.data.type === 'TELEMETRY_DATA') setMetrics(e.data.payload);
        };
        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);

    return (
        <div style={{
            position: 'absolute', top: 20, left: 20, color: '#00ff66',
            fontFamily: '"Fira Code", monospace', fontSize: '11px', pointerEvents: 'none',
            background: 'rgba(5,5,8,0.75)', padding: '12px', borderLeft: '3px solid #00ff66', zIndex: 100
        }}>
            <div style={{ fontWeight: 'bold' }}>STARS_ENGINE_V1.0-CORE</div>
            <div style={{ opacity: 0.5, margin: '4px 0' }}>-------------------</div>
            <div>TICK: 60Hz (HARDWARE)</div>
            <div>SCENE_NODES: {entityCount}</div>
            <div>KERNEL_LOAD: {metrics.workerLoad.toFixed(3)}ms</div>
            <div style={{ marginTop: '4px' }}>GPU_VIEWPORT: {Math.round(metrics.fps)} FPS</div>
        </div>
    );
}