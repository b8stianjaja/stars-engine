import { useEffect, useState, memo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSystemicStore } from './core/engine.store';
import { Viewport } from './view/Viewport';
import { LiveEditor } from './components/editor/LiveEditor';
import { WorkspaceSidebar } from './components/editor/WorkspaceSidebar';
import { DrawingCanvasLayer } from './components/editor/DrawingCanvasLayer';
import { InputBridge } from './core/bridge/input.bridge.js';

// Memoria Física y de Hardware
const SHARED_MEM_SIZE = 2000 * 16 * 4;
const sharedBuffer = new SharedArrayBuffer(SHARED_MEM_SIZE);

const INPUT_MEM_SIZE = 256 * 4;
const inputSharedBuffer = new SharedArrayBuffer(INPUT_MEM_SIZE);

const EngineCanvas = memo(({ worker }) => (
    <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true, alpha: true }}
        camera={{ position: [0, 2, 8], fov: 45 }}
    >
        <Viewport sharedBuffer={sharedBuffer} worker={worker} />
    </Canvas>
), (prevProps, nextProps) => prevProps.worker === nextProps.worker);

export function App() {
    const registerEntity = useSystemicStore(state => state.registerEntity);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);

    const [kernelWorker, setKernelWorker] = useState(null);
    const bootSequenceRun = useRef(false);

    useEffect(() => {
        if (bootSequenceRun.current) return;
        bootSequenceRun.current = true;

        InputBridge.initialize(inputSharedBuffer);

        const worker = new Worker(new URL('./core/logic.worker.js', import.meta.url), { type: 'module' });
        worker.postMessage({ type: 'INIT_MEM', payload: { physics: sharedBuffer, input: inputSharedBuffer } });

        const floorData = { index: 0, name: 'Suelo Base', type: 'box', scale: [40, 0.5, 40], color: '#e5e5ea', position: [0, -0.25, 0] };
        registerEntity('static_floor_0', floorData);
        worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'static_floor_0', ...floorData, x: 0, y: -0.25, z: 0, scaleX: 40, scaleY: 0.5, scaleZ: 40 } });

        setKernelWorker(worker);

        return () => {
            worker.terminate();
            bootSequenceRun.current = false;
        };
    }, [registerEntity]);

    const toggleTheme = () => document.documentElement.classList.toggle('dark-theme');
    const isDesignMode = studioMode === 'design';

    return (
        <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-app)', overflow: 'hidden', display: 'flex', fontFamily: 'var(--font-sans)', transition: 'background 0.3s ease' }}>
            <style>{`
                :root {
                    --bg-app: #111111; --bg-sidebar: rgba(20, 20, 20, 0.85); --bg-panel: #1a1a1a;
                    --bg-input: #2a2a2a; --bg-input-hover: #333333; --bg-active: #0071e3;
                    --text-main: #f5f5f7; --text-secondary: #86868b; --text-active: #ffffff;
                    --border: rgba(255,255,255,0.08); --accent: #0071e3;
                    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
                    --blur-panel: blur(20px);
                }
                html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: var(--bg-app); }
                * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
            `}</style>

            <div style={{ position: 'relative', width: '340px', height: '100%', background: 'var(--bg-sidebar)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)', borderRight: '1px solid var(--border)', zIndex: 100, flexShrink: 0 }}>
                <WorkspaceSidebar worker={kernelWorker} toggleTheme={toggleTheme} isDark={true} />
            </div>

            <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden', display: 'flex' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}><DrawingCanvasLayer targetLayer="background" /></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}><EngineCanvas worker={kernelWorker} /></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 15 }}><DrawingCanvasLayer targetLayer="midground" /></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20 }}><DrawingCanvasLayer targetLayer="foreground" /></div>

                <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', background: 'var(--bg-sidebar)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)', borderLeft: '1px solid var(--border)', zIndex: 100, transform: isDesignMode ? 'translateX(100%)' : 'translateX(0)', opacity: isDesignMode ? 0 : 1, pointerEvents: isDesignMode ? 'none' : 'auto', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease' }}>
                    <LiveEditor worker={kernelWorker} />
                </div>
            </div>
        </div>
    );
}