// src/App.jsx
import { useEngineKernel } from './core/hooks/useEngineKernel';
import { WorkspaceLayout } from './layout/WorkspaceLayout';

export function App() {
    const { kernelWorker, isBuildRuntime } = useEngineKernel();

    return (
        <>
            <style>{`
                :root {
                    --bg-app: #08080a; 
                    --bg-sidebar: rgba(11, 11, 14, 0.65); 
                    --bg-panel: rgba(18, 18, 24, 0.82);
                    --bg-input: #131318; 
                    --bg-input-hover: #1a1a24; 
                    --bg-active: #0071e3;
                    --text-main: #f5f5f7; 
                    --text-secondary: #86868b; 
                    --text-muted: #424245;
                    --text-active: #ffffff;
                    --border: rgba(255, 255, 255, 0.05); 
                    --border-hover: rgba(255, 255, 255, 0.12);
                    --accent: #0071e3;
                    --accent-glow: rgba(0, 113, 227, 0.35);
                    --accent-subtle: rgba(0, 113, 227, 0.12);
                    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif;
                    --blur-panel: blur(32px); 
                    --radius-lg: 12px;
                    --radius-md: 8px;
                    --radius-sm: 6px;
                    --shadow-premium: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.08) inset;
                }
                
                html, body, #root { 
                    margin: 0; 
                    padding: 0; 
                    width: 100%; 
                    height: 100%; 
                    overflow: hidden; 
                    background-color: var(--bg-app); 
                    color: var(--text-main);
                    font-family: var(--font-sans);
                }
                
                * { 
                    box-sizing: border-box; 
                    -webkit-font-smoothing: antialiased; 
                    -moz-osx-font-smoothing: grayscale;
                }
                
                /* Custom Premium Studio Scrollbars */
                ::-webkit-scrollbar { 
                    width: 6px; 
                    height: 6px; 
                }
                ::-webkit-scrollbar-track { 
                    background: transparent; 
                }
                ::-webkit-scrollbar-thumb { 
                    background: rgba(255, 255, 255, 0.08); 
                    border-radius: 20px; 
                    border: 1px solid transparent;
                    background-clip: padding-box;
                }
                ::-webkit-scrollbar-thumb:hover { 
                    background: rgba(255, 255, 255, 0.2); 
                    border-radius: 20px;
                    border: 1px solid transparent;
                    background-clip: padding-box;
                }
                
                /* Form Control Overrides for Visual Consistency */
                select, input, button {
                    font-family: inherit;
                }
            `}</style>

            <WorkspaceLayout
                worker={kernelWorker}
                isBuildRuntime={isBuildRuntime}
            />
        </>
    );
}