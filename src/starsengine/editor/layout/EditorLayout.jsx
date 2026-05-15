// src/starsengine/editor/layout/EditorLayout.jsx
import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useEngineStore } from '../../core/stores/engineStore';
import { Viewport } from '../../renderer/Viewport';
import { HierarchyPanel } from '../panels/HierarchyPanel';
import { InspectorPanel } from '../panels/InspectorPanel';
import { ArtistTools } from '../panels/ArtistTools';

export function EditorLayout() {
    const {
        uiTheme, toggleTheme,
        workspaceMode, setWorkspaceMode,
        cameraProjection, toggleCameraProjection
    } = useEditorStore();

    const playState = useEngineStore(state => state.playState);
    const setPlayState = useEngineStore(state => state.setPlayState);

    const accent = playState === 'PLAYING' ? '#22c55e' : '#0ea5e9';

    return (
        <div className="stars-engine-app" data-theme={uiTheme} style={{ display: 'flex', flexDirection: 'column' }}>
            <header className="engine-header" style={{ borderBottom: `2px solid ${accent}` }}>
                <div style={{ fontWeight: 900, color: accent }}>STARS_ENGINE // {workspaceMode.toUpperCase()}</div>

                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '2px', borderRadius: '4px' }}>
                    <button className="ui-btn" style={{ border: 'none' }} onClick={() => setPlayState('STOPPED')}>⏹</button>
                    <button className="ui-btn" style={{ border: 'none', color: '#22c55e' }} onClick={() => setPlayState('PLAYING')}>▶</button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="ui-btn" value={workspaceMode} onChange={e => setWorkspaceMode(e.target.value)}>
                        <option value="artist">ARTIST ROLE</option>
                        <option value="dev">DEV ROLE</option>
                    </select>
                    <button className="ui-btn" onClick={toggleCameraProjection}>
                        {cameraProjection === 'perspective' ? '3D' : '2D'}
                    </button>
                    <button className="ui-btn" onClick={toggleTheme}>{uiTheme === 'dark' ? '🌙' : '☀️'}</button>
                </div>
            </header>

            <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* PANEL IZQUIERDO: Cambia según el ROL */}
                <aside className="panel" style={{ width: 'var(--panel-width)', borderRight: '1px solid var(--border-color)' }}>
                    {workspaceMode === 'artist' ? <ArtistTools /> : <HierarchyPanel />}
                </aside>

                <section style={{ flex: 1, position: 'relative', background: '#000' }}>
                    <Viewport />
                </section>

                <aside className="panel" style={{ width: 'var(--panel-width)', borderLeft: '1px solid var(--border-color)' }}>
                    <InspectorPanel />
                </aside>
            </main>
        </div>
    );
}