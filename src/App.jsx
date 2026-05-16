import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSystemicStore } from './core/engine.store';
import { Viewport } from './view/Viewport';
import { LiveEditor } from './components/editor/LiveEditor';
import { WorkspaceSidebar } from './components/editor/WorkspaceSidebar';
import { DrawingCanvasLayer } from './components/editor/DrawingCanvasLayer';
import { initSyncClient } from './core/bridge/sync.client';

const SHARED_MEM_SIZE = 2000 * 3 * 4;
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

        // ESCENA BOOTSTRAP DE PRUEBAS
        registerEntity('map_floor', { index: 0, name: 'Suelo Arena', type: 'box', scale: [20, 0.2, 20], color: '#0b0b0f', position: [0, -0.1, 0] });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'map_floor', index: 0, x: 0, y: -0.1, z: 0, scaleX: 20, scaleY: 0.2, scaleZ: 20 } });

        registerEntity('core_unit_0', { index: 1, name: 'Héroe Jugador', type: 'box', scale: [0.8, 0.8, 0.8], color: '#00ff66', position: [3, 0.4, 3], faction: 'player', health: 100, attackPower: 25 });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'core_unit_0', index: 1, x: 3, y: 0.4, z: 3, scaleX: 0.8, scaleY: 0.8, scaleZ: 0.8, gameplay: { faction: 'player', health: 100, attackPower: 25 } } });

        registerEntity('enemy_orc_0', { index: 2, name: 'Orco Hostil', type: 'box', scale: [1, 1, 1], color: '#ef4444', position: [-3, 0.5, -3], faction: 'enemy', health: 120, attackPower: 10 });
        logicWorker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'enemy_orc_0', index: 2, x: -3, y: 0.5, z: -3, scaleX: 1, scaleY: 1, scaleZ: 1, gameplay: { faction: 'enemy', health: 120, attackPower: 10 } } });

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

    // CONFIGURACIÓN DINÁMICA DE DIMENSIONES ASIMÉTRICAS PRECISAS
    const isArtist = studioMode === 'artist';
    const viewportWidth = isArtist ? 'calc(100vw - 300px)' : 'calc(50vw - 150px)';
    const editorWidth = isArtist ? '0px' : 'calc(50vw - 150px)';

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#020204', overflow: 'hidden', position: 'relative', display: 'flex' }}>

            {/* PANEL 1: CONTROL LATERAL UNIFICADO */}
            <WorkspaceSidebar worker={activeWorker} />

            {/* PANEL 2: CONTENEDOR GRÁFICO (MUTABLE SEGÚN ROL) */}
            <div style={{
                position: 'relative', width: viewportWidth, height: '100vh',
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)', background: '#050508'
            }}>
                <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
                    <Viewport sharedBuffer={sharedBuffer} worker={activeWorker} />
                </Canvas>

                {/* Capa de Dibujo: Se auto-desmonta síncronamente fuera del modo artístico */}
                <DrawingCanvasLayer worker={activeWorker} />
            </div>

            {/* PANEL 3: ESTACIÓN IDE DE DESARROLLADOR MASIVO (DESPLIEGUE LATERAL SÍNCRONO) */}
            {!isArtist && activeWorker && (
                <div style={{
                    width: editorWidth, height: '100vh', borderLeft: '1px solid #161622',
                    background: '#09090c', boxSizing: 'border-box', position: 'relative'
                }}>
                    <LiveEditor worker={activeWorker} />
                </div>
            )}
        </div>
    );
}