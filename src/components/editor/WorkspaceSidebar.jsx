import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { ArtistStudioPanel } from './ArtistStudioPanel';
import { DeveloperStudioPanel } from './DeveloperStudioPanel';

export function WorkspaceSidebar({ worker }) {
    const studioMode = useSystemicStore(useShallow(state => state.workspace.studioMode));
    const setStudioMode = useSystemicStore(state => state.setStudioMode);

    return (
        <div style={{
            width: '320px',
            height: '100vh',
            background: '#030305',
            borderRight: '1px solid #14141f',
            padding: '12px',
            boxSizing: 'border-box',
            color: '#e2e8f0',
            fontFamily: '"Inter", sans-serif',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flexShrink: 0,
            userSelect: 'none'
        }}>
            {/* ENCABEZADO ESTRUCTURAL */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #14141f',
                paddingBottom: '8px'
            }}>
                <span style={{
                    fontSize: '10px',
                    letterSpacing: '2px',
                    color: '#6366f1',
                    fontWeight: 'bold',
                    fontFamily: '"Fira Code", monospace'
                }}>
                    STARS_ENGINE // SYSTEM_IDE
                </span>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#09090f',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: '1px solid #14141f'
                }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: '8px', fontFamily: '"Fira Code", monospace', color: '#10b981', fontWeight: 'bold' }}>CORE_ONLINE</span>
                </div>
            </div>

            {/* CONMUTADOR DE ROL PROFESIONAL */}
            <div style={{
                display: 'flex',
                background: '#09090f',
                padding: '2px',
                borderRadius: '4px',
                border: '1px solid #14141f'
            }}>
                <button
                    onClick={() => setStudioMode('design')}
                    style={{
                        flex: 1,
                        padding: '6px 0',
                        fontSize: '10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        border: 'none',
                        background: studioMode === 'design' ? '#ff00aa' : 'transparent',
                        color: studioMode === 'design' ? '#fff' : '#475569',
                        fontFamily: '"Fira Code", monospace',
                        fontWeight: 'bold',
                        transition: 'all 0.12s ease-in-out'
                    }}
                >
                    SCENE_DESIGN
                </button>
                <button
                    onClick={() => setStudioMode('logic')}
                    style={{
                        flex: 1,
                        padding: '6px 0',
                        fontSize: '10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        border: 'none',
                        background: studioMode === 'logic' ? '#6366f1' : 'transparent',
                        color: studioMode === 'logic' ? '#fff' : '#475569',
                        fontFamily: '"Fira Code", monospace',
                        fontWeight: 'bold',
                        transition: 'all 0.12s ease-in-out'
                    }}
                >
                    SYSTEM_LOGIC
                </button>
            </div>

            {/* CONTENEDOR OPERATIVO */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {studioMode === 'design' ? (
                    <ArtistStudioPanel worker={worker} />
                ) : (
                    <DeveloperStudioPanel worker={worker} />
                )}
            </div>
        </div>
    );
}