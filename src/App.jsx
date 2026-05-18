// src/App.jsx
import { useEngineKernel } from './core/hooks/useEngineKernel';
import { WorkspaceLayout } from './layout/WorkspaceLayout';

export function App() {
    const { kernelWorker, isBuildRuntime } = useEngineKernel();

    return (
        <>
            <style>{`
                :root {
                    --bg-app: #070709; --bg-sidebar: rgba(10, 10, 12, 0.75); --bg-panel: rgba(18, 18, 22, 0.85);
                    --bg-input: #1a1a20; --bg-input-hover: #24242e; --bg-active: #0071e3;
                    --text-main: #f5f5f7; --text-secondary: #86868b; --text-active: #ffffff;
                    --border: rgba(255, 255, 255, 0.05); --accent: #0071e3;
                    --accent-subtle: rgba(0, 113, 227, 0.12);
                    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
                    --blur-panel: blur(28px); --radius-md: 10px; --radius-sm: 6px;
                    --shadow-premium: 0 12px 40px rgba(0,0,0,0.6);
                }
                html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: var(--bg-app); }
                * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>

            <WorkspaceLayout
                worker={kernelWorker}
                isBuildRuntime={isBuildRuntime}
            />
        </>
    );
}