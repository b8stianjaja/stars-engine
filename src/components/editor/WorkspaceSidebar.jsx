// src/components/editor/WorkspaceSidebar.jsx
import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { ArtistStudioPanel } from './ArtistStudioPanel';
import { DeveloperStudioPanel } from '../../components/editor/DeveloperStudioPanel';

export function WorkspaceSidebar({ worker, isDark, toggleTheme }) {
    const studioMode = useSystemicStore(useShallow(state => state.workspace.studioMode));
    const setStudioMode = useSystemicStore(state => state.setStudioMode);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            padding: '16px',
            boxSizing: 'border-box',
            color: '#f5f5f7',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden'
        }}>
            {/* CORE BRAND TRACK TRACKER */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '2px',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#34c759',
                        boxShadow: '0 0 8px #34c759'
                    }} />
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.8px',
                        color: '#f5f5f7',
                        textTransform: 'uppercase'
                    }}>
                        STARS CORE NODE
                    </span>
                </div>

                {/* THEME CONTROL RING */}
                <button
                    onClick={toggleTheme}
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#f5f5f7',
                        fontSize: '11px',
                        transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                >
                    {isDark ? '☀️' : '🌙'}
                </button>
            </div>

            {/* APPLE-STYLE SEGMENTED SPACE SEGMENTS */}
            <div style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                flexShrink: 0
            }}>
                <button
                    onClick={() => setStudioMode('design')}
                    style={{
                        flex: 1,
                        padding: '6px 0',
                        fontSize: '12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: 'none',
                        background: studioMode === 'design' ? '#0071e3' : 'transparent',
                        color: studioMode === 'design' ? '#ffffff' : '#86868b',
                        fontWeight: studioMode === 'design' ? '600' : '500',
                        transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        outline: 'none'
                    }}
                >
                    Diseño Visual
                </button>
                <button
                    onClick={() => setStudioMode('logic')}
                    style={{
                        flex: 1,
                        padding: '6px 0',
                        fontSize: '12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: 'none',
                        background: studioMode === 'logic' ? '#0071e3' : 'transparent',
                        color: studioMode === 'logic' ? '#ffffff' : '#86868b',
                        fontWeight: studioMode === 'logic' ? '600' : '500',
                        transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        outline: 'none'
                    }}
                >
                    Mapeo Lógico
                </button>
            </div>

            {/* OPERATIONAL FLUID SLATE SCROLL TRACK */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowX: 'hidden',
                overflowY: 'auto',
                boxSizing: 'border-box'
            }}>
                {studioMode === 'design' ? (
                    <ArtistStudioPanel worker={worker} />
                ) : (
                    <DeveloperStudioPanel worker={worker} />
                )}
            </div>
        </div>
    );
}