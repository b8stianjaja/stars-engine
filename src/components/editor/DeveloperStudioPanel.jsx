import { useState, useEffect } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';

export function DeveloperStudioPanel({ worker }) {
    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const entities = useSystemicStore(state => state.entities);
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);

    const registerEntity = useSystemicStore(state => state.registerEntity);
    const setEntityAsMask = useSystemicStore(state => state.setEntityAsMask);
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const removeEntity = useSystemicStore(state => state.removeEntity);
    const updateEntityProperty = useSystemicStore(state => state.updateEntityProperty);

    // Estados para la adición dinámica de nuevas variables en el Inspector
    const [newPropKey, setNewPropKey] = useState('');
    const [newPropVal, setNewPropVal] = useState('0');

    const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;

    const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 6)}`;

    const handleAddBlockout = () => {
        const id = generateId('block');
        const payload = { type: 'box', name: 'Muro Base', scale: [1, 2, 1], color: '#ff9500', position: [0, 1, 0], properties: { speed: 0, bounce: 0.2 } };
        registerEntity(id, payload);
        const freshEntity = useSystemicStore.getState().entities[id];
        if (worker) worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, ...payload, index: freshEntity.index, x: 0, y: 1, z: 0, scaleX: 1, scaleY: 2, scaleZ: 1 } });
    };

    const handleAddSprite = () => {
        const id = generateId('actor');
        const payload = { type: 'sprite', name: 'Personaje 2D', scale: [1, 1.5, 1], color: '#34c759', position: [0, 0.75, 0], properties: { speed: 5, jumpForce: 10 } };
        registerEntity(id, payload);
        const freshEntity = useSystemicStore.getState().entities[id];
        if (worker) worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id, ...payload, index: freshEntity.index, x: 0, y: 0.75, z: 0, scaleX: 1, scaleY: 1.5, scaleZ: 1 } });
    };

    const handlePropertyChange = (key, rawValue) => {
        if (!selectedEntityId) return;
        let value = rawValue;
        if (!isNaN(rawValue) && rawValue !== '') value = Number(rawValue);

        // 1. Sincronización atómica paramétrica (Zustand)
        updateEntityProperty(selectedEntityId, key, value);

        // 2. Transmisión instantánea al Kernel físico (Web Worker)
        if (worker) {
            worker.postMessage({
                type: 'UPDATE_ENTITY_PROPERTIES',
                payload: { id: selectedEntityId, properties: { [key]: value } }
            });
        }
    };

    const handleAddNewProperty = (e) => {
        e.preventDefault();
        if (!selectedEntityId || !newPropKey.trim()) return;

        const cleanedKey = newPropKey.replace(/\s+/g, '_');
        handlePropertyChange(cleanedKey, newPropVal);
        setNewPropKey('');
        setNewPropVal('0');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', marginTop: '16px', paddingBottom: '20px' }}>

            {/* CONSTRUCTORES DE MUNDO */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleAddBlockout} style={btnStyle('var(--bg-input)')}>
                    + Cubo Blockout
                </button>
                <button onClick={handleAddSprite} style={btnStyle('var(--accent-subtle)', 'var(--accent)')}>
                    + Sprite 2D
                </button>
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* JERARQUÍA DE ESCENA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Jerarquía de Escena
                </span>

                {entityIds.map(id => {
                    const ent = entities[id];
                    const isSelected = id === selectedEntityId;
                    const hasLogic = !!ent.scriptCode;
                    return (
                        <div
                            key={id}
                            onClick={() => selectEntity(id)}
                            style={{
                                padding: '8px 12px',
                                background: isSelected ? 'var(--accent)' : 'var(--bg-input)',
                                color: isSelected ? '#fff' : 'var(--text-main)',
                                borderRadius: 'var(--radius-sm, 5px)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'background 0.15s'
                            }}
                        >
                            <span style={{ fontWeight: isSelected ? '600' : '500' }}>{ent.name}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {hasLogic && <span style={{ fontSize: '10px', background: isSelected ? 'rgba(0,0,0,0.2)' : 'var(--accent-subtle)', color: isSelected ? '#fff' : 'var(--accent)', padding: '2px 6px', borderRadius: '4px' }}>⚡</span>}
                                {ent.isGhostMask && <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>MÁSCARA</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* INSPECTOR UNIVERSAL REAL-TIME */}
            {selectedEntity && (
                <div style={{
                    padding: '14px', background: 'var(--bg-panel)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md, 8px)', display: 'flex', flexDirection: 'column', gap: '14px',
                    boxShadow: 'var(--shadow-md)', flexShrink: 0, maxHeight: '360px', overflowY: 'auto'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{selectedEntity.name}</span>
                        <button
                            onClick={() => { removeEntity(selectedEntityId); if (worker) worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id: selectedEntityId } }); }}
                            style={{ background: 'transparent', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}
                        >
                            Eliminar
                        </button>
                    </div>

                    {selectedEntity.type !== 'sprite' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={selectedEntity.isGhostMask || false}
                                onChange={(e) => setEntityAsMask(selectedEntityId, e.target.checked)}
                                style={{ accentColor: 'var(--accent)' }}
                            />
                            Máscara de Oclusión (Z-Depth)
                        </label>
                    )}

                    <div style={{ height: '1px', background: 'var(--border)' }} />

                    {/* GENERADOR REFLECTIVO DE CAMPOS (Data-Driven) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            Data Properties
                        </span>

                        {Object.entries(selectedEntity.properties ?? {}).map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{key}</span>
                                    <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{String(val)}</span>
                                </div>
                                <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => handlePropertyChange(key, e.target.value)}
                                    style={{
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm, 5px)', color: 'var(--text-main)',
                                        padding: '4px 8px', fontSize: '11px', outline: 'none'
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

                    {/* INYECTOR DE VARIABLES EN CALIENTE */}
                    <form onSubmit={handleAddNewProperty} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            + Inyectar Nueva Propiedad
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="text"
                                placeholder="Clave (ej: peso)"
                                value={newPropKey}
                                onChange={(e) => setNewPropKey(e.target.value)}
                                style={{
                                    flex: 1, background: '#0d0d0d', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)', color: '#fff', padding: '4px 6px', fontSize: '11px'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Valor base"
                                value={newPropVal}
                                onChange={(e) => setNewPropVal(e.target.value)}
                                style={{
                                    width: '70px', background: '#0d0d0d', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)', color: '#fff', padding: '4px 6px', fontSize: '11px'
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    color: 'var(--text-main)', padding: '0 10px', borderRadius: 'var(--radius-sm)',
                                    fontSize: '11px', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                Añadir
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

const btnStyle = (bg, color = 'var(--text-main)') => ({
    flex: 1, padding: '8px 0', background: bg, border: 'none', borderRadius: 'var(--radius-sm, 5px)',
    color: color, fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.1s'
});