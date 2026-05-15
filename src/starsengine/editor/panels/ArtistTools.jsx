// src/starsengine/editor/panels/ArtistTools.jsx
import React from 'react';
import { drawingManager } from '../../core/logic/DrawingManager';

export function ArtistTools() {
    const colors = ['#ffffff', '#ff4444', '#44ff44', '#4444ff', '#facc15', '#000000'];

    return (
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                ARTIST TOOLBOX
            </div>

            {/* Selector de Color */}
            <section>
                <div style={{ fontSize: '10px', marginBottom: '8px', opacity: 0.6 }}>PALETTE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {colors.map(c => (
                        <div
                            key={c}
                            onClick={() => drawingManager.setBrush({ color: c })}
                            style={{
                                width: '100%',
                                aspectRatio: '1',
                                background: c,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: '2px solid var(--border-color)'
                            }}
                        />
                    ))}
                </div>
            </section>

            {/* Configuración de Pincel */}
            <section>
                <div style={{ fontSize: '10px', marginBottom: '8px', opacity: 0.6 }}>BRUSH SIZE</div>
                <input
                    type="range" min="1" max="100" defaultValue="5"
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                    onChange={(e) => drawingManager.setBrush({ size: parseInt(e.target.value) })}
                />

                <div style={{ fontSize: '10px', marginTop: '16px', marginBottom: '8px', opacity: 0.6 }}>OPACITY</div>
                <input
                    type="range" min="0" max="1" step="0.1" defaultValue="1"
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                    onChange={(e) => drawingManager.setBrush({ opacity: parseFloat(e.target.value) })}
                />
            </section>
        </div>
    );
}