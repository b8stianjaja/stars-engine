// src/starsengine/editor/panels/InspectorPanel.jsx
import React, { useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useEngineStore } from '../../core/stores/engineStore';

export function InspectorPanel() {
    const selectedId = useEditorStore(state => state.selectedEntityId);
    const entity = useEngineStore(state => state.entities[selectedId]);
    const { updateComponent, addEntity } = useEngineStore();

    if (!entity) return <EmptyInspector onAdd={addEntity} />;

    return (
        <div className="panel" style={{ padding: '16px', gap: '20px', overflowY: 'auto' }}>
            <header style={{ borderBottom: '1px solid var(--border-color)', pb: '12px' }}>
                <h2 style={{ fontSize: '14px', letterSpacing: '1px' }}>{entity.name.toUpperCase()}</h2>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>UUID: {entity.id}</span>
            </header>

            {/* SECCIÓN: TRANSFORM (Precisión 3D) */}
            <section>
                <Label>SPATIAL TRANSFORM</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                    {entity.components.Transform.pos.map((v, i) => (
                        <input
                            key={i} type="number" className="ui-btn" style={{ width: '100%' }}
                            value={v} onChange={e => {
                                const next = [...entity.components.Transform.pos];
                                next[i] = parseFloat(e.target.value);
                                updateComponent(entity.id, 'Transform', { pos: next });
                            }}
                        />
                    ))}
                </div>
            </section>

            {/* SECCIÓN: SYSTEMIC STATS (Survival Logic) */}
            {entity.components.Stats && (
                <section>
                    <Label>METABOLISM (Don't Starve Style)</Label>
                    <StatBar label="HUNGER" value={entity.components.Stats.hunger} color="#f59e0b" />
                    <StatBar label="HEALTH" value={entity.components.Stats.health} color="#ef4444" />
                </section>
            )}

            {/* SECCIÓN: SCRIPTING (Live Logic) */}
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Label>BEHAVIOR SCRIPT</Label>
                <textarea
                    style={{
                        flex: 1, background: 'var(--bg-input)', color: '#34d399',
                        fontFamily: 'monospace', fontSize: '11px', padding: '8px',
                        border: '1px solid var(--border-color)', borderRadius: '4px',
                        resize: 'none', minHeight: '200px'
                    }}
                    value={entity.components.Script?.source || ''}
                    onChange={e => updateComponent(entity.id, 'Script', { source: e.target.value })}
                    placeholder="// function onUpdate(entity, dt, api) { ... }"
                />
            </section>
        </div>
    );
}

const Label = ({ children }) => <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>{children}</div>;

const StatBar = ({ label, value, color }) => (
    <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', mb: '2px' }}>
            <span>{label}</span>
            <span>{Math.round(value)}%</span>
        </div>
        <div style={{ height: '4px', background: '#27272a', borderRadius: '2px' }}>
            <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>
    </div>
);

const EmptyInspector = ({ onAdd }) => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', mb: '20px' }}>No entity selected</p>
        <button className="ui-btn" style={{ width: '100%' }} onClick={() => onAdd('Actor', { Stats: { health: 100, hunger: 100, sanity: 100 }, Script: { source: '' } })}>
            + CREATE SYSTEMIC ACTOR
        </button>
    </div>
);