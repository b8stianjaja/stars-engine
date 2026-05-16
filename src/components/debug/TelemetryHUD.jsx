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
            color: '#00ff66',
            fontFamily: '"Fira Code", monospace',
            fontSize: '11px',
            padding: '12px',
            background: '#050508',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#475569' }}>SYSTEM_TICK:</span>
                <span style={{ fontWeight: 'bold' }}>60Hz_FIXED</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#475569' }}>SCENE_NODES:</span>
                <span>{entityCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#475569' }}>KERNEL_LOAD:</span>
                <span style={{ color: metrics.workerLoad > 5 ? '#ef4444' : '#00ff66', fontWeight: 'bold' }}>
                    {metrics.workerLoad.toFixed(3)}ms
                </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>GPU_VIEWPORT:</span>
                <span style={{ color: '#ff00aa', fontWeight: 'bold' }}>{Math.round(metrics.fps)} FPS</span>
            </div>
        </div>
    );
}