import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { ArtistStudioPanel } from './ArtistStudioPanel';
import { DeveloperStudioPanel } from './DeveloperStudioPanel';

export function WorkspaceSidebar({ worker, isDark, toggleTheme }) {
    const studioMode = useSystemicStore(useShallow(state => state.workspace.studioMode));
    const setStudioMode = useSystemicStore(state => state.setStudioMode);

    return (
        <div style={{
            width: '340px',
            height: '100vh',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border)',
            padding: '20px 16px',
            boxSizing: 'border-box',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-sans)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flexShrink: 0,
            userSelect: 'none',
            boxShadow: 'var(--shadow-md)',
            transition: 'background 0.3s, border-color 0.3s'
        }}>
            {/* ENCABEZADO MINIMALISTA */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '2px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        letterSpacing: '-0.3px',
                        color: 'var(--text-main)'
                    }}>
                        Estudio de Arte
                    </span>
                </div>

                <button
                    onClick={toggleTheme}
                    style={{
                        background: 'var(--bg-input)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        fontSize: '13px',
                        transition: 'background 0.2s'
                    }}
                >
                    {isDark ? '☀️' : '🌙'}
                </button>
            </div>

            {/* CONTROL SEGMENTADO TIPO APPLE */}
            <div style={{
                display: 'flex',
                background: 'var(--bg-input)',
                padding: '2px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
            }}>
                <button
                    onClick={() => setStudioMode('design')}
                    style={{
                        flex: 1,
                        padding: '7px 0',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: 'none',
                        background: studioMode === 'design' ? 'var(--bg-panel)' : 'transparent',
                        color: studioMode === 'design' ? 'var(--text-main)' : 'var(--text-secondary)',
                        fontWeight: studioMode === 'design' ? '600' : '500',
                        transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        boxShadow: studioMode === 'design' ? 'var(--shadow-sm)' : 'none'
                    }}
                >
                    Diseño Visual
                </button>
                <button
                    onClick={() => setStudioMode('logic')}
                    style={{
                        flex: 1,
                        padding: '7px 0',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: 'none',
                        background: studioMode === 'logic' ? 'var(--bg-panel)' : 'transparent',
                        color: studioMode === 'logic' ? 'var(--text-main)' : 'var(--text-secondary)',
                        fontWeight: studioMode === 'logic' ? '600' : '500',
                        transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        boxShadow: studioMode === 'logic' ? 'var(--shadow-sm)' : 'none'
                    }}
                >
                    Lógica
                </button>
            </div>

            {/* AREA OPERATIVA */}
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