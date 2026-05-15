// src/starsengine/editor/panels/HierarchyPanel.jsx
import React from 'react';
import { useEngineStore } from '../../core/stores/engineStore';
import { useEditorStore } from '../stores/editorStore';

export function HierarchyPanel() {
    const activeSceneId = useEngineStore(state => state.activeSceneId);
    // Obtenemos solo la lista de IDs de la escena activa
    const entityIds = useEngineStore(state => state.scenes[activeSceneId]?.entityIds || []);

    const selectedEntityId = useEditorStore(state => state.selectedEntityId);
    const setSelectedEntity = useEditorStore(state => state.setSelectedEntity);

    return (
        <div className="panel-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="panel-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                SCENE HIERARCHY
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {entityIds.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>Scene is empty</div>
                ) : (
                    entityIds.map(id => (
                        <EntityRow
                            key={id}
                            id={id}
                            isSelected={selectedEntityId === id}
                            onClick={() => setSelectedEntity(id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// Sub-componente optimizado para evitar re-renders innecesarios
const EntityRow = React.memo(({ id, isSelected, onClick }) => {
    const entity = useEngineStore(state => state.entities[id]);
    if (!entity) return null;

    return (
        <div
            onClick={onClick}
            style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                borderBottom: '1px solid var(--border-color)'
            }}
        >
            <span>{entity.name}</span>
            <span style={{ fontSize: '10px', opacity: 0.6 }}>
                {entity.components?.Sprite ? 'SPRITE' : 'MESH'}
            </span>
        </div>
    );
});