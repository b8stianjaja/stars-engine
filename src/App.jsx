import { useEffect, useState, memo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSystemicStore } from './core/engine.store';
import { Viewport } from './view/Viewport';
import { LiveEditor } from './components/editor/LiveEditor';
import { WorkspaceSidebar } from './components/editor/WorkspaceSidebar';
import { DrawingCanvasLayer } from './components/editor/DrawingCanvasLayer';

// 1. GESTIÓN DE MEMORIA ABSOLUTA (Fuera del ciclo de React para sobrevivir a HMR/Recargas)
const SHARED_MEM_SIZE = 2000 * 16 * 4;
const sharedBuffer = new SharedArrayBuffer(SHARED_MEM_SIZE);

// 2. AISLAMIENTO DEL CONTEXTO WEBGL (Evita el "Context Lost")
// Al envolver el Canvas en memo(), garantizamos que NINGÚN cambio en la UI (paneles, clics)
// forzará una recarga de la GPU o del árbol de Three.js.
const EngineCanvas = memo(({ worker }) => (
    <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        camera={{ position: [5, 5, 5], fov: 50 }}
    >
        <Viewport sharedBuffer={sharedBuffer} worker={worker} />
    </Canvas>
), (prevProps, nextProps) => prevProps.worker === nextProps.worker);

export function App() {
    // Estado Atómico
    const applyPatch = useSystemicStore(state => state.applyPatch);
    const registerEntity = useSystemicStore(state => state.registerEntity);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);

    // Referencias de núcleo
    const [kernelWorker, setKernelWorker] = useState(null);
    const bootSequenceRun = useRef(false);

    // 3. SECUENCIA DE ARRANQUE DEL KERNEL (Protegida contra StrictMode)
    useEffect(() => {
        if (bootSequenceRun.current) return;
        bootSequenceRun.current = true;

        console.log("[STARS ENGINE] Secuencia de arranque iniciada...");

        const worker = new Worker(
            new URL('./core/logic.worker.js', import.meta.url),
            { type: 'module' }
        );

        worker.postMessage({ type: 'INIT_MEM', payload: sharedBuffer });

        // Instanciación limpia y segura del entorno base
        const floorData = { index: 0, name: 'Lienzo de Composición', type: 'box', scale: [40, 0.2, 40], color: '#e5e5ea', position: [0, -0.1, 0], gameplay: { faction: 'neutral', health: 100, maxHealth: 100, damage: 0 } };
        registerEntity('static_floor_0', floorData);
        worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'static_floor_0', ...floorData, x: 0, y: -0.1, z: 0, scaleX: 40, scaleY: 0.2, scaleZ: 40 } });

        const handleWorkerMessage = (e) => {
            if (e.data.type === 'PATCH') applyPatch(e.data.payload);
        };
        worker.addEventListener('message', handleWorkerMessage);

        setKernelWorker(worker);

        return () => {
            worker.removeEventListener('message', handleWorkerMessage);
            worker.terminate();
            bootSequenceRun.current = false;
        };
    }, [applyPatch, registerEntity]);

    // 4. CONTROL DE ESTÉTICA "APPLE" POR MUTACIÓN DIRECTA AL DOM (Cero Re-renders Reactivos)
    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark-theme');
    };

    // 5. SISTEMA FLUIDO DE PANELES (Desacoplamiento Espacial)
    const isDesignMode = studioMode === 'design';

    return (
        <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-app)', overflow: 'hidden', display: 'flex', fontFamily: 'var(--font-sans)', transition: 'background 0.3s ease' }}>
            <style>{`
                :root {
                    --bg-app: #f5f5f7; --bg-sidebar: rgba(255, 255, 255, 0.85); --bg-panel: #ffffff;
                    --bg-input: #f2f2f7; --bg-input-hover: #e5e5ea; --bg-active: #0071e3;
                    --text-main: #1d1d1f; --text-secondary: #86868b; --text-active: #ffffff;
                    --border: rgba(0,0,0,0.08); --border-strong: #d2d2d7; --accent: #0071e3;
                    --accent-subtle: rgba(0, 113, 227, 0.08); --radius-lg: 12px; --radius-md: 8px; --radius-sm: 6px;
                    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif;
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04); --shadow-md: 0 8px 24px rgba(0,0,0,0.08);
                    --blur-panel: blur(20px);
                }
                .dark-theme {
                    --bg-app: #000000; --bg-sidebar: rgba(28, 28, 30, 0.85); --bg-panel: #1c1c1e;
                    --bg-input: #2c2c2e; --bg-input-hover: #3a3a3c; --bg-active: #0a84ff;
                    --text-main: #f5f5f7; --text-secondary: #86868b; --text-active: #ffffff;
                    --border: rgba(255,255,255,0.08); --border-strong: #424245; --accent: #0a84ff;
                    --accent-subtle: rgba(10, 132, 255, 0.15); --shadow-sm: 0 1px 2px rgba(0,0,0,0.2); --shadow-md: 0 8px 32px rgba(0,0,0,0.4);
                }
                html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: var(--bg-app); }
                * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
            `}</style>

            {/* BARRA LATERAL DEL ARTISTA (Flotante y Difuminada) */}
            <div style={{
                position: 'relative', width: '340px', height: '100%',
                background: 'var(--bg-sidebar)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)',
                borderRight: '1px solid var(--border)', zIndex: 100, flexShrink: 0,
                boxShadow: 'var(--shadow-md)', transition: 'background 0.3s ease, border-color 0.3s ease'
            }}>
                <WorkspaceSidebar worker={kernelWorker} toggleTheme={toggleTheme} />
            </div>

            {/* CONTENEDOR DEL LIENZO 3D (Eterno, nunca se desmonta) */}
            <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden', display: 'flex' }}>

                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                    <EngineCanvas worker={kernelWorker} />
                </div>

                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}>
                    <DrawingCanvasLayer worker={kernelWorker} />
                </div>

                {/* EDITOR DE CÓDIGO (Panel Deslizante) */}
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
                    background: 'var(--bg-sidebar)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)',
                    borderLeft: '1px solid var(--border)', zIndex: 10,
                    transform: isDesignMode ? 'translateX(100%)' : 'translateX(0)',
                    opacity: isDesignMode ? 0 : 1, pointerEvents: isDesignMode ? 'none' : 'auto',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.05)'
                }}>
                    <LiveEditor worker={kernelWorker} />
                </div>
            </div>
        </div>
    );
}