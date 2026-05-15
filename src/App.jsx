import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSystemicStore } from './core/engine.store';
import { Viewport } from './view/Viewport';

// Espacio para 2000 entidades (x,y,z) 
const SHARED_MEM_SIZE = 2000 * 3 * 4;
const sharedBuffer = new SharedArrayBuffer(SHARED_MEM_SIZE);

export function App() {
    const applyPatch = useSystemicStore(state => state.applyPatch);
    const registerEntity = useSystemicStore(state => state.registerEntity);

    const worker = useMemo(() => new Worker(
        new URL('./core/logic.worker.js', import.meta.url),
        { type: 'module' }
    ), []);

    useEffect(() => {
        worker.postMessage({ type: 'INIT_MEM', payload: sharedBuffer });

        // Bootstrap: Unidad Central de Prueba [cite: 49]
        const testId = 'core_unit_0';
        registerEntity(testId, { name: 'STARS_CORE' }, 'hash_default');
        worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: testId, index: 0 } });

        worker.onmessage = (e) => {
            if (e.data.type === 'PATCH') applyPatch(e.data.payload);
        };

        return () => worker.terminate();
    }, [worker, applyPatch, registerEntity]);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#050505', overflow: 'hidden' }}>
            <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
                <Viewport sharedBuffer={sharedBuffer} />
            </Canvas>

            <div className="telemetry-hud" style={{
                position: 'absolute', top: 20, left: 20,
                color: '#00ff00', fontFamily: '"Fira Code", monospace',
                fontSize: '10px', pointerEvents: 'none', opacity: 0.8
            }}>
                STARS_ENGINE_V1.0.0-PRO // KERNEL_CONNECTED // 60HZ_SYNC [cite: 41]
            </div>
        </div>
    );
}