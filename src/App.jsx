import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSystemicStore } from './core/engine.store';
import { Viewport } from './view/Viewport';
import { LiveEditor } from './components/editor/LiveEditor';
import { TelemetryHUD } from './components/debug/TelemetryHUD';
import { WorkspaceSidebar } from './components/editor/WorkspaceSidebar';
import { initSyncClient } from './core/bridge/sync.client';

const SHARED_MEM_SIZE = 2000 * 3 * 4;
const sharedBuffer = new SharedArrayBuffer(SHARED_MEM_SIZE);

export function App() {
    const applyPatch = useSystemicStore(state => state.applyPatch);
    const registerEntity = useSystemicStore(state => state.registerEntity);
    const [activeWorker, setActiveWorker] = useState(null);

    useEffect(() => {
        const logicWorker = new Worker(
            new URL('./core/logic.worker.js', import.meta.url),
            { type: 'module' }
        );

        logicWorker.postMessage({ type: 'INIT_MEM', payload: sharedBuffer });

        // --- ENTORNO PARAMÉTRICO INICIAL ---

        // 1. Suelo Base Estático
        registerEntity('map_floor', { index: 0, name: 'Plataforma Suelo', type: 'box', scale: [14, 0.2, 14], color: '#14141c', position: [0, -0.1, 0] });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'map_floor', index: 0, x: 0, y: -0.1, z: 0 } });

        // 2. Columna del Edificio
        registerEntity('map_pillar', { index: 1, name: 'Andamio Columna', type: 'box', scale: [2, 4, 2], color: '#2563eb', position: [-2.5, 2, -2.5] });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'map_pillar', index: 1, x: -2.5, y: 2, z: -2.5 } });

        // 3. Tejado Piramidal
        registerEntity('map_roof', { index: 2, name: 'Andamio Tejado', type: 'pyramid', scale: [2.2, 1.2, 2.2], color: '#dc2626', position: [-2.5, 4.6, -2.5] });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'map_roof', index: 2, x: -2.5, y: 4.6, z: -2.5 } });

        // 4. Unidad Actor Dinámica
        registerEntity('core_unit_0', { index: 3, name: 'Unidad Actor', type: 'box', scale: [0.7, 0.7, 0.7], color: '#10b981', position: [2, 0.35, 2] });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'core_unit_0', index: 3, x: 2, y: 0.35, z: 2 } });

        const handleWorkerMessage = (e) => {
            if (e.data.type === 'PATCH') applyPatch(e.data.payload);
        };
        logicWorker.addEventListener('message', handleWorkerMessage);

        const socket = initSyncClient(logicWorker);
        setActiveWorker(logicWorker);

        return () => {
            logicWorker.removeEventListener('message', handleWorkerMessage);
            logicWorker.terminate();
            if (socket) socket.disconnect();
        };
    }, [applyPatch, registerEntity]);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#050505', overflow: 'hidden', position: 'relative' }}>
            {/* El Viewport se adapta quirúrgicamente al diseño del Workspace Studio */}
            <div style={{ position: 'absolute', top: 0, left: '280px', width: 'calc(100vw - 280px)', height: 'calc(100vh - 240px)' }}>
                <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
                    <Viewport sharedBuffer={sharedBuffer} />
                </Canvas>
            </div>

            {/* Barra lateral de control e Inspector Paramétrico */}
            <WorkspaceSidebar worker={activeWorker} />

            {activeWorker && (
                <>
                    <TelemetryHUD worker={activeWorker} />
                    <LiveEditor worker={activeWorker} />
                </>
            )}
        </div>
    );
}