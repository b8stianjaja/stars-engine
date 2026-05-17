import React, { useState } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';

export function DataInspectorPanel({ worker }) {
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const entity = useSystemicStore(
        useShallow(state => state.entities[selectedEntityId] || null)
    );
    const updateEntityProperty = useSystemicStore(state => state.updateEntityProperty);
    const setEntityAsMask = useSystemicStore(state => state.setEntityAsMask);

    const [propKey, setPropKey] = useState('');
    const [propValue, setPropValue] = useState('');

    if (!selectedEntityId || !entity) {
        return (
            <div style={styles.emptyContainer}>
                <span style={styles.emptyText}>SELECCIONE UN ACTOR PARA DETECTAR VARIABLES</span>
            </div>
        );
    }

    const handleFieldMutation = (key, value) => {
        let castingValue = value;
        if (!isNaN(value) && value.trim() !== '') {
            castingValue = Number(value);
        }

        // 1. Mutar Zustand Reactivo Local
        updateEntityProperty(selectedEntityId, key, castingValue, false);

        // 2. Transmitir inmediatamente al Kernel del subhilo del Web Worker
        if (worker) {
            worker.postMessage({
                type: 'UPDATE_ENTITY_PROPERTIES',
                payload: { id: selectedEntityId, properties: { [key]: castingValue } }
            });
        }
    };

    const handleAddCustomField = (e) => {
        e.preventDefault();
        if (!propKey.trim()) return;
        handleFieldMutation(propKey.trim(), propValue);
        setPropKey('');
        setPropValue('');
    };

    return (
        <div style={styles.container}>
            <div style={styles.panelTitleContainer}>
                <span style={styles.panelTitle}>INSPECTOR DE HARDWARE</span>
                <span style={styles.entityIdBadge}>INDEX: {entity.index}</span>
            </div>

            {/* CONFIGURACIÓN HÍBRIDA 2.5D */}
            <div style={styles.cardSection}>
                <span style={styles.sectionHeader}>Oclusión Híbrida</span>
                <div style={styles.propertyRow}>
                    <span style={styles.propertyLabel}>Activar Ghost Mask</span>
                    <input
                        type="checkbox"
                        checked={entity.isGhostMask || false}
                        onChange={(e) => setEntityAsMask(selectedEntityId, e.target.checked)}
                        style={styles.checkboxControl}
                    />
                </div>
            </div>

            {/* DICCIONARIO REFLECTIVO DINÁMICO */}
            <div style={styles.cardSection}>
                <span style={styles.sectionHeader}>Diccionario de Datos Corrientes</span>
                {Object.entries(entity.properties || {}).map(([key, val]) => (
                    <div key={key} style={styles.propertyRow}>
                        <span style={styles.propertyKey}>{key}</span>
                        {key === 'speed' ? (
                            <div style={styles.sliderGroup}>
                                <input
                                    type="range"
                                    min="0"
                                    max="40"
                                    step="0.5"
                                    value={val}
                                    onChange={(e) => handleFieldMutation(key, e.target.value)}
                                    style={styles.rangeSlider}
                                />
                                <span style={styles.sliderValue}>{val}</span>
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={val}
                                onChange={(e) => handleFieldMutation(key, e.target.value)}
                                style={styles.propertyInput}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* FORMULARIO DE INYECCIÓN EN CALIENTE DE NUEVAS VARIABLES */}
            <form onSubmit={handleAddCustomField} style={styles.injectionForm}>
                <span style={styles.injectionTitle}>Inyectar Variable en Caliente</span>
                <input
                    type="text"
                    placeholder="Clave (ej: mass)"
                    value={propKey}
                    onChange={(e) => setPropKey(e.target.value)}
                    style={styles.injectionInput}
                    required
                />
                <input
                    type="text"
                    placeholder="Valor inicial"
                    value={propValue}
                    onChange={(e) => setPropValue(e.target.value)}
                    style={styles.injectionInput}
                />
                <button type="submit" style={styles.injectButton}>INYECTAR AL KERNEL</button>
            </form>
        </div>
    );
}

const styles = {
    container: { width: '300px', backgroundColor: '#141416', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
    emptyContainer: { width: '300px', backgroundColor: '#141416', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', boxSizing: 'border-box' },
    emptyText: { color: '#44444a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textAlign: 'center' },
    panelTitleContainer: { padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { fontSize: '11px', fontWeight: '700', color: '#0071e3', letterSpacing: '0.5px' },
    entityIdBadge: { fontSize: '9px', fontFamily: 'monospace', backgroundColor: '#222226', padding: '3px 6px', borderRadius: '4px', color: '#86868b' },
    cardSection: { padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    sectionHeader: { display: 'block', fontSize: '10px', fontWeight: '700', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' },
    propertyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
    propertyLabel: { fontSize: '12px', color: '#e3e3e7' },
    propertyKey: { fontSize: '12px', fontFamily: 'monospace', color: '#a1a1a6' },
    propertyInput: { backgroundColor: '#222226', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#fff', fontSize: '12px', padding: '4px 8px', width: '110px', textAlign: 'right', outline: 'none' },
    checkboxControl: { accentColor: '#0071e3', width: '14px', height: '14px' },
    sliderGroup: { display: 'flex', alignItems: 'center', gap: '6px' },
    rangeSlider: { width: '80px', accentColor: '#0071e3' },
    sliderValue: { fontSize: '11px', fontFamily: 'monospace', color: '#fff', minWidth: '20px', textAlign: 'right' },
    injectionForm: { padding: '16px', backgroundColor: '#09090b', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
    injectionTitle: { fontSize: '10px', fontWeight: '700', color: '#86868b', textTransform: 'uppercase', marginBottom: '2px' },
    injectionInput: { backgroundColor: '#222226', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', color: '#fff', fontSize: '12px', padding: '6px 10px', outline: 'none' },
    injectButton: { backgroundColor: '#0071e3', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '8px', cursor: 'pointer', letterSpacing: '0.3px', marginTop: '4px' }
};