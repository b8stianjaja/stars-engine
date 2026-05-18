// src/App.jsx
import { useEffect, useState, memo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSystemicStore } from './core/engine.store';
import { Viewport } from './view/Viewport';
import { LiveEditor } from './components/editor/LiveEditor';
import { WorkspaceSidebar } from './components/editor/WorkspaceSidebar';
import { DrawingCanvasLayer } from './components/editor/DrawingCanvasLayer';
import { ProjectSystemControls } from './components/editor/ProjectSystemControls';
import { InputBridge } from './core/bridge/input.bridge.js';
import { TelemetryHUD } from './components/debug/TelemetryHUD';

// ENTORNO COLABORATIVO GRADO APPLE
import { CollaborationHeader } from './components/editor/CollaborationHeader';
import { DataInspectorPanel } from './components/editor/DataInspectorPanel';
import { initSyncClient } from './core/bridge/sync.client';

const MAX_ENTITIES = 2000;
const SHARED_MEM_SIZE = MAX_ENTITIES * 16 * 4;
const sharedBuffer = new SharedArrayBuffer(SHARED_MEM_SIZE);

const INPUT_MEM_SIZE = 256 * 4;
const inputSharedBuffer = new SharedArrayBuffer(INPUT_MEM_SIZE);

const EngineCanvas = memo(({ worker }) => (
    <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true, alpha: true }}
        camera={{ position: [0, 4, 10], fov: 45 }}
    >
        <Viewport sharedBuffer={sharedBuffer} worker={worker} />
    </Canvas>
), (prevProps, nextProps) => prevProps.worker === nextProps.worker);

export function App() {
    const registerEntity = useSystemicStore(state => state.registerEntity);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);
    const paintMode = useSystemicStore(state => state.layerPlayback.paintMode);

    const [kernelWorker, setKernelWorker] = useState(null);
    const bootSequenceRun = useRef(false);

    useEffect(() => {
        if (bootSequenceRun.current) return;
        bootSequenceRun.current = true;

        InputBridge.initialize(inputSharedBuffer);

        const view = new Float32Array(sharedBuffer);
        for (let i = 0; i < MAX_ENTITIES; i++) {
            const offset = i * 16;
            view[offset + 6] = 1; // rotW
            view[offset + 7] = 1; // scaleX
            view[offset + 8] = 1; // scaleY
            view[offset + 9] = 1; // scaleZ
        }

        const worker = new Worker(new URL('./core/logic.worker.js', import.meta.url), { type: 'module' });
        worker.postMessage({ type: 'INIT_MEM', payload: { physics: sharedBuffer, input: inputSharedBuffer } });

        const floorData = {
            index: MAX_ENTITIES - 1,
            name: 'Suelo Base',
            type: 'box',
            scale: [40, 0.5, 40],
            color: '#1a1a1e',
            position: [0, -0.25, 0]
        };

        registerEntity('static_floor_0', floorData);
        worker.postMessage({
            type: 'ADD_ENTITY_LOGIC',
            payload: {
                id: 'static_floor_0',
                ...floorData,
                x: 0, y: -0.25, z: 0,
                scaleX: 40, scaleY: 0.5, scaleZ: 40
            }
        });

        setKernelWorker(worker);

        // Inicialización nativa silenciosa del canalizador LAN al arrancar
        initSyncClient(worker);

        return () => {
            worker.terminate();
            bootSequenceRun.current = false;
        };
    }, [registerEntity]);

    const toggleTheme = () => document.documentElement.classList.toggle('dark-theme');
    const isDesignMode = studioMode === 'design';

    const zIndices = paintMode ? {
        background: 1,
        canvas3D: 10,
        midground: 15,
        foreground: 20
    } : {
        background: 1,
        midground: 2,
        foreground: 3,
        canvas3D: 30
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: 'var(--bg-app)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'var(--font-sans)',
            transition: 'background 0.3s ease'
        }}>
            <style>{`
                :root {
                    --bg-app: #09090b; --bg-sidebar: rgba(15, 15, 17, 0.85); --bg-panel: #141416;
                    --bg-input: #222226; --bg-input-hover: #2d2d34; --bg-active: #0071e3;
                    --text-main: #f5f5f7; --text-secondary: #86868b; --text-active: #ffffff;
                    --border: rgba(255,255,255,0.06); --accent: #0071e3;
                    --accent-subtle: rgba(0, 113, 227, 0.15);
                    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
                    --blur-panel: blur(24px);
                    --radius-md: 8px; --radius-sm: 5px;
                }
                html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: var(--bg-app); }
                * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
            `}</style>

            {/* CABECERA DE TELEMETRÍA SUPERIOR */}
            <CollaborationHeader worker={kernelWorker} />

            {/* BARRA SECUNDARIA DE CONTROLES DE PERSISTENCIA */}
            <ProjectSystemControls worker={kernelWorker} />

            {/* ESPACIO DE TRABAJO PRINCIPAL MULTIPANEL */}
            <div style={{
                display: 'flex',
                flex: 1,
                width: '100%',
                height: 'calc(100% - 79px)', // Altura exacta para acoplar ambas barras superiores de forma rígida
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* COLUMNA IZQUIERDA: ESTRUCTURA Y NAVEGACIÓN */}
                <div style={{ position: 'relative', width: '340px', height: '100%', background: 'var(--bg-sidebar)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)', borderRight: '1px solid var(--border)', zIndex: 100, flexShrink: 0 }}>
                    <WorkspaceSidebar worker={kernelWorker} toggleTheme={toggleTheme} isDark={true} />
                </div>

                {/* AREA CENTRAL DE SIMULACIÓN E ILUSTRACIÓN 2.5D */}
                <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.background }}><DrawingCanvasLayer targetLayer="background" /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.canvas3D }}><EngineCanvas worker={kernelWorker} /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.midground }}><DrawingCanvasLayer targetLayer="midground" /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.foreground }}><DrawingCanvasLayer targetLayer="foreground" /></div>

                    {/* Telemetría de bajo nivel flotante */}
                    <TelemetryHUD sharedBuffer={sharedBuffer} />

                    {/* ENTORNO DE EDICIÓN LÓGICA (DESPLEGABLE MONACO DESDE LA DERECHA) */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '50%',
                        height: '100%',
                        background: 'var(--bg-sidebar)',
                        backdropFilter: 'var(--blur-panel)',
                        WebkitBackdropFilter: 'var(--blur-panel)',
                        borderLeft: '1px solid var(--border)',
                        zIndex: 110,
                        transform: isDesignMode ? 'translateX(100%)' : 'translateX(0)',
                        opacity: isDesignMode ? 0 : 1,
                        pointerEvents: isDesignMode ? 'none' : 'auto',
                        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease'
                    }}>
                        <LiveEditor worker={kernelWorker} />
                    </div>
                </div>

                {/* COLUMNA DERECHA PERIMETRAL: INSPECTOR DE VARIABLES REFLECTIVO */}
                <div style={{ zIndex: 120, height: '100%', position: 'relative', flexShrink: 0 }}>
                    <DataInspectorPanel worker={kernelWorker} />
                </div>
            </div>
        </div>
    );
}