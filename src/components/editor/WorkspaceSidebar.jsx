import { useShallow } from 'zustand/react/shallow';
import { useSystemicStore } from '../../core/engine.store';
import { ArtistStudioPanel } from './ArtistStudioPanel';
import { DeveloperStudioPanel } from './DeveloperStudioPanel';

export function WorkspaceSidebar({ worker }) {
    const studioMode = useSystemicStore(useShallow(state => state.workspace.studioMode));
    const setStudioMode = useSystemicStore(state => state.setStudioMode);

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '300px', height: 'calc(100vh - 240px)',
            background: '#050508', borderRight: '1px solid #161622', padding: '16px',
            boxSizing: 'border-box', color: '#f1f5f9', fontFamily: '"Inter", sans-serif', zIndex: 100,
            display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto'
        }}>
            {/* CABECERA INDUSTRIAL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #161622', paddingBottom: '12px' }}>
                <span style={{ fontSize: '11px', letterSpacing: '2px', color: '#6366f1', fontWeight: 800, fontFamily: '"Fira Code", monospace' }}>
                    STARS_ENGINE // V1.0
                </span>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            </div>

            {/* SWITCH MAESTRO DE ROL PROFESIONAL */}
            <div style={{
                display: 'flex', background: '#0d0d12', padding: '3px', borderRadius: '6px',
                border: '1px solid #161622'
            }}>
                <button
                    onClick={() => setStudioMode('artist')}
                    style={{
                        flex: 1, padding: '8px 0', fontSize: '10px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                        background: studioMode === 'artist' ? '#ff00aa' : 'transparent',
                        color: studioMode === 'artist' ? '#fff' : '#64748b',
                        fontFamily: '"Fira Code", monospace', fontWeight: 'bold', transition: 'all 0.15s ease-in-out'
                    }}
                >
                    ARTIST_STUDIO
                </button>
                <button
                    onClick={() => setStudioMode('developer')}
                    style={{
                        flex: 1, padding: '8px 0', fontSize: '10px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                        background: studioMode === 'developer' ? '#6366f1' : 'transparent',
                        color: studioMode === 'developer' ? '#fff' : '#64748b',
                        fontFamily: '"Fira Code", monospace', fontWeight: 'bold', transition: 'all 0.15s ease-in-out'
                    }}
                >
                    DEV_KERNEL
                </button>
            </div>

            {/* CONTROL DINÁMICO DE PANELES */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {studioMode === 'artist' ? (
                    <ArtistStudioPanel worker={worker} />
                ) : (
                    <DeveloperStudioPanel worker={worker} />
                )}
            </div>
        </div>
    );
}