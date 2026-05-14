import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../core/stores/sceneStore';
import { useUIStore } from '../core/stores/uiStore';

export function Inspector() {
  const {
    entities,
    addEntity,
    removeEntity,
    updateEntityLogic,
    updateEntityData,
    isPlaying,
    togglePlay
  } = useSceneStore(useShallow(state => ({
    entities: state.entities,
    addEntity: state.addEntity,
    removeEntity: state.removeEntity,
    updateEntityLogic: state.updateEntityLogic,
    updateEntityData: state.updateEntityData,
    isPlaying: state.isPlaying,
    togglePlay: state.togglePlay
  })));

  const [selectedId, setSelectedId] = useState(null);
  const [newTag, setNewTag] = useState('');

  const selectedEntity = entities.find(e => e.id === selectedId);

  const handleAddTag = (e) => {
    e.preventDefault();
    if (newTag.trim() && selectedEntity) {
      const currentTags = selectedEntity.logic?.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        updateEntityLogic(selectedId, { tags: [...currentTags, newTag.trim()] });
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    if (selectedEntity) {
      const updatedTags = selectedEntity.logic.tags.filter(t => t !== tagToRemove);
      updateEntityLogic(selectedId, { tags: updatedTags });
    }
  };

  const panelStyle = { width: '320px', background: '#1a1a1a', color: '#eaeaea', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', height: '100vh', overflowY: 'auto' };
  const sectionStyle = { padding: '1rem', borderBottom: '1px solid #333' };
  const buttonStyle = { background: '#3a3a3a', color: '#fff', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', width: '100%', marginBottom: '0.5rem' };
  const playButtonStyle = { ...buttonStyle, background: isPlaying ? '#ff4757' : '#2ed573' };

  if (isPlaying) {
    return (
      <div style={panelStyle}>
        <div style={sectionStyle}>
          <button style={playButtonStyle} onClick={togglePlay}>stop playtest</button>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={sectionStyle}>
        <h2>master controls</h2>
        <button style={playButtonStyle} onClick={togglePlay}>enter play mode</button>
      </div>

      <div style={sectionStyle}>
        <h3>entities</h3>
        <button style={{ ...buttonStyle, background: '#3498db' }} onClick={() => addEntity('cube')}>+ add primitive</button>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
          {entities.map(e => (
            <li
              key={e.id}
              style={{ padding: '0.5rem', background: selectedId === e.id ? '#333' : 'transparent', cursor: 'pointer', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => setSelectedId(e.id)}
            >
              <span>{e.name}</span>
              <button
                onClick={(ev) => { ev.stopPropagation(); removeEntity(e.id); if (selectedId === e.id) setSelectedId(null); }}
                style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
              >✕</button>
            </li>
          ))}
        </ul>
      </div>

      {selectedEntity && (
        <div style={sectionStyle}>
          <h3>logic inspector</h3>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>color hex</label>
            <input
              type="text"
              value={selectedEntity.color || ''}
              onChange={(e) => updateEntityData(selectedId, { color: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444' }}
            />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h4>tags</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {(selectedEntity.logic?.tags || []).map(tag => (
                <span key={tag} style={{ background: '#2c3e50', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {tag} <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="new tag" style={{ flex: 1, padding: '0.5rem', background: '#222', color: '#fff' }} />
              <button type="submit" style={{ ...buttonStyle, width: 'auto', margin: 0 }}>add</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}