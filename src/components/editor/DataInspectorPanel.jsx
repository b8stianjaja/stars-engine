// src/components/editor/DataInspectorPanel.jsx
import { useEffect, useRef } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';
import gsap from 'gsap';

export function DataInspectorPanel({ worker }) {
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const activeEntity = useSystemicStore(useShallow(state => state.entities[selectedEntityId]));

    const updateEntityTransform = useSystemicStore(state => state.updateEntityTransform);
    const updateEntityProperty = useSystemicStore(state => state.updateEntityProperty);
    const removeEntity = useSystemicStore(state => state.removeEntity);

    const panelContentRef = useRef(null);

    // Animación de Entrada Reactiva cuando cambia la selección
    useEffect(() => {
        if (selectedEntityId && panelContentRef.current) {
            gsap.fromTo(panelContentRef.current,
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }
            );
        }
    }, [selectedEntityId]);

    if (!selectedEntityId || !activeEntity) {
        return (
            <div style={styles.emptyState}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span style={styles.emptyText}>Ninguna Entidad Seleccionada</span>
            </div>
        );
    }

    const handlePropChange = (key, value) => {
        updateEntityProperty(selectedEntityId, key, value);
        if (worker) {
            worker.postMessage({
                type: 'UPDATE_ENTITY_PROPERTIES',
                payload: { id: selectedEntityId, properties: { [key]: value } }
            });
        }
    };

    const handleTypeChange = (newType) => {
        updateEntityTransform(selectedEntityId, 'type', newType);
        if (worker) {
            worker.postMessage({
                type: 'UPDATE_PHYSICAL_POS',
                payload: { id: selectedEntityId, type: newType }
            });
        }
    };

    const handleDelete = () => {
        removeEntity(selectedEntityId);
        if (worker) {
            worker.postMessage({ type: 'REMOVE_ENTITY_LOGIC', payload: { id: selectedEntityId } });
        }
    };

    return (
        <div style={styles.container}>
            {/* HEADER DEL INSPECTOR */}
            <div style={styles.header}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={styles.title}>{activeEntity.name}</span>
                    <span style={styles.subtitle}>ID: {selectedEntityId} | Index: {activeEntity.index}</span>
                </div>
                <button
                    onClick={handleDelete}
                    style={styles.deleteButton}
                    onMouseEnter={(e) => gsap.to(e.currentTarget, { backgroundColor: 'rgba(230, 57, 70, 0.12)', borderColor: '#e63946', duration: 0.2 })}
                    onMouseLeave={(e) => gsap.to(e.currentTarget, { backgroundColor: 'transparent', borderColor: 'rgba(230, 57, 70, 0.2)', duration: 0.2 })}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>

            {/* CONTENIDO DESLIZABLE FORMULARIO */}
            <div ref={panelContentRef} style={styles.scrollArea}>

                {/* SECCIÓN: GEOMETRÍA ESTUCTURAL */}
                <div style={styles.section}>
                    <span style={styles.sectionLabel}>ESTRUCTURA DE MALLA</span>
                    <div style={styles.fieldRow}>
                        <span style={styles.label}>Primitiva</span>
                        <select
                            value={activeEntity.type || 'box'}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            style={styles.select}
                        >
                            <option value="box">Cubo (Box)</option>
                            <option value="sphere">Esfera (Sphere)</option>
                            <option value="cylinder">Cilindro (Cylinder)</option>
                            <option value="capsule">Cápsula (Capsule)</option>
                            <option value="plane">Plano (Plane)</option>
                        </select>
                    </div>
                </div>

                <div style={styles.divider} />

                {/* SECCIÓN: MATERIALES Y SUPERFICIE */}
                <div style={styles.section}>
                    <span style={styles.sectionLabel}>PROPIEDADES DE SUPERFICIE</span>

                    <div style={styles.fieldRow}>
                        <span style={styles.label}>Color Base</span>
                        <div style={styles.colorWrapper}>
                            <input
                                type="color"
                                value={activeEntity.properties?.color || '#ffffff'}
                                onChange={(e) => handlePropChange('color', e.target.value)}
                                style={styles.colorInput}
                            />
                            <span style={styles.colorHex}>{activeEntity.properties?.color ?? '#FFFFFF'}</span>
                        </div>
                    </div>

                    <div style={styles.fieldRow}>
                        <span style={styles.label}>Rugosidad</span>
                        <div style={styles.rangeWrapper}>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={activeEntity.properties?.roughness ?? 0.5}
                                onChange={(e) => handlePropChange('roughness', parseFloat(e.target.value))}
                                style={styles.rangeInput}
                            />
                            <span style={styles.valueDisplay}>{(activeEntity.properties?.roughness ?? 0.5).toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={styles.fieldRow}>
                        <span style={styles.label}>Oclusión Z-Depth (Mask)</span>
                        <input
                            type="checkbox"
                            checked={activeEntity.isGhostMask || false}
                            onChange={(e) => updateEntityTransform(selectedEntityId, 'isGhostMask', e.target.checked)}
                            style={styles.checkbox}
                        />
                    </div>
                </div>

                <div style={styles.divider} />

                {/* SECCIÓN: PARÁMETROS FÍSICOS DINÁMICOS */}
                <div style={styles.section}>
                    <span style={styles.sectionLabel}>FÍSICAS Y DINÁMICA (KERNEL)</span>

                    <div style={styles.fieldRow}>
                        <span style={styles.label}>Masa</span>
                        <div style={styles.inputWithUnit}>
                            <input
                                type="number" min="0" step="0.1"
                                value={activeEntity.properties?.mass ?? 1.0}
                                onChange={(e) => handlePropChange('mass', parseFloat(e.target.value))}
                                style={styles.numberInput}
                            />
                            <span style={styles.unitBadge}>kg</span>
                        </div>
                    </div>

                    <div style={styles.fieldRow}>
                        <span style={styles.label}>Fricción Superficie</span>
                        <input
                            type="number" min="0" max="1" step="0.1"
                            value={activeEntity.properties?.friction ?? 0.8}
                            onChange={(e) => handlePropChange('friction', parseFloat(e.target.value))}
                            style={styles.numberInput}
                        />
                    </div>

                    <div style={styles.fieldRow}>
                        <span style={styles.label}>Sensor Triggers</span>
                        <input
                            type="checkbox"
                            checked={activeEntity.properties?.isTrigger || false}
                            onChange={(e) => handlePropChange('isTrigger', e.target.checked)}
                            style={styles.checkbox}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

const styles = {
    emptyState: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', color: 'var(--text-secondary)' },
    emptyText: { fontSize: '12px', fontWeight: '600', letterSpacing: '-0.2px' },
    container: { display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-main)' },
    header: { padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)' },
    title: { fontSize: '12px', fontWeight: '700', letterSpacing: '0.3px', textTransform: 'uppercase' },
    subtitle: { fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' },
    deleteButton: { background: 'transparent', border: '1px solid rgba(230,57,70,0.2)', borderRadius: 'var(--radius-sm)', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' },
    scrollArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
    section: { display: 'flex', flexDirection: 'column', gap: '14px' },
    sectionLabel: { fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.6px' },
    fieldRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' },
    label: { fontSize: '11px', color: 'var(--text-main)', fontWeight: '500' },
    select: { backgroundColor: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: '11px', outline: 'none', width: '140px', cursor: 'pointer', transition: 'border-color 0.2s' },
    colorWrapper: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', width: '140px' },
    colorInput: { backgroundColor: 'transparent', border: 'none', width: '20px', height: '20px', cursor: 'pointer', padding: 0 },
    colorHex: { fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', textTransform: 'uppercase' },
    rangeWrapper: { display: 'flex', alignItems: 'center', gap: '10px', width: '140px' },
    rangeInput: { flex: 1, cursor: 'pointer', accentColor: 'var(--accent)', margin: 0, height: '4px' },
    valueDisplay: { fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', width: '28px', textAlign: 'right' },
    inputWithUnit: { display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', width: '90px', overflow: 'hidden' },
    numberInput: { backgroundColor: 'transparent', color: '#fff', border: 'none', padding: '6px 8px', fontSize: '11px', outline: 'none', width: '100%', textAlign: 'right', fontFamily: 'monospace' },
    unitBadge: { fontSize: '9px', fontWeight: '700', color: 'var(--text-secondary)', paddingRight: '8px', userSelect: 'none' },
    checkbox: { width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--accent)', margin: '0 6px 0 0' },
    divider: { width: '100%', height: '1px', backgroundColor: 'var(--border)' }
};