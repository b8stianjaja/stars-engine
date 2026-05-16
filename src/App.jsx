import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSystemicStore } from './core/engine.store';
import { Viewport } from './view/Viewport';
import { LiveEditor } from './components/editor/LiveEditor';
import { WorkspaceSidebar } from './components/editor/WorkspaceSidebar';
import { DrawingCanvasLayer } from './components/editor/DrawingCanvasLayer';
import { initSyncClient } from './core/bridge/sync.client';

// SCHEMA 2.0: 2000 Entidades * 16 Floats por Stride * 4 Bytes (Float32) = 128 KB Asignados
const SHARED_MEM_SIZE = 2000 * 16 * 4;
const sharedBuffer = new SharedArrayBuffer(SHARED_MEM_SIZE);

export function App() {
    const applyPatch = useSystemicStore(state => state.applyPatch);
    const registerEntity = useSystemicStore(state => state.registerEntity);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);
    const [activeWorker, setActiveWorker] = useState(null);

    useEffect(() => {
        const logicWorker = new Worker(
            new URL('./core/logic.worker.js', import.meta.url),
            { type: 'module' }
        );

        logicWorker.postMessage({ type: 'INIT_MEM', payload: sharedBuffer });

        // INICIALIZACIÓN DE ENTIDADES BOOTSTRAP BAJO ESQUEMA INDUSTRIAL
        registerEntity('static_floor_0', { index: 0, name: 'Suelo_Principal', type: 'box', scale: [40, 0.2, 40], color: '#09090c', position: [0, -0.1, 0] });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'static_floor_0', index: 0, x: 0, y: -0.1, z: 0, scaleX: 40, scaleY: 0.2, scaleZ: 40 } });

        registerEntity('actor_player_0', { index: 1, name: 'Entidad_Jugador', type: 'box', scale: [1, 1, 1], color: '#6366f1', position: [2, 0.5, 2], gameplay: { faction: 'player', health: 100, maxHealth: 100, damage: 25 } });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'actor_player_0', index: 1, x: 2, y: 0.5, z: 2, scaleX: 1, scaleY: 1, scaleZ: 1, gameplay: { faction: 'player', health: 100, maxHealth: 100, damage: 25 } } });

        const handleWorkerMessage = (e) => {
            if (e.data.type === 'PATCH') applyPatch(e.data.payload);
        };
        logicWorker.addEventListener('message', handleWorkerMessage);

        initSyncClient(logicWorker);
        setActiveWorker(logicWorker);

        return () => {
            logicWorker.removeEventListener('message', handleWorkerMessage);
            logicWorker.terminate();
        };
    }, [applyPatch, registerEntity]);

    const isDesignMode = studioMode === 'design';
    const viewportWidth = isDesignMode ? 'calc(100% - 300px)' : 'calc(50% - 150px)';
    const editorWidth = isDesignMode ? '0px' : 'calc(50% - 150px)';

    return (
        <div style={{ width: '100%', height: '100vh', background: '#020204', overflow: 'hidden', position: 'relative', display: 'flex' }}>
            <style>{`
                html, body, #root {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    overflow: hidden !important;
                    background-color: #020204 !important;
                    user-select: none;
                }
            `}</style>

            <WorkspaceSidebar worker={activeWorker} />

            <div style={{
                position: 'relative', width: viewportWidth, height: '100vh',
                transition: 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)', background: '#050508',
                flexShrink: 0
            }}>
                <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
                    <Viewport sharedBuffer={sharedBuffer} worker={activeWorker} />
                </Canvas>

                <DrawingCanvasLayer worker={activeWorker} />
            </div>

            {!isDesignMode && activeWorker && (
                <div style={{
                    width: editorWidth, height: '100vh', borderLeft: '1px solid #161622',
                    background: '#09090c', boxSizing: 'border-box', position: 'relative',
                    transition: 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden',
                    flexShrink: 0
                }}>
                    <LiveEditor worker={activeWorker} />
                </div>
            )}
        </div>
    );
}