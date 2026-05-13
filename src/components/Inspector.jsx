import React, { useState } from 'react';
import { useStore } from '../core/store';

export function Inspector() {
  const { 
    entities, 
    addEntity, 
    removeEntity, 
    updateEntityLogic, 
    updateEntityVisual,
    isPlaying, 
    togglePlay, 
    exportSceneData,
    importSceneData
  } = useStore();

  const [selectedId, setSelectedId] = useState(null);
  const [newTag, setNewTag] = useState('');

  const selectedEntity = entities.find(e => e.id === selectedId);

  const handleAddTag = (e) => {
    e.preventDefault();
    if (newTag.trim() && selectedEntity) {
      const currentTags = selectedEntity.logic.tags || [];
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

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const manifest = JSON.parse(event.target.result);
          importSceneData(manifest);
        } catch (err) {
          console.error("Failed to parse manifest", err);
        }
      };
      reader.readAsText(file);
    }
  };

  // Modern UI panel styling
  const panelStyle = {
    width: '320px',
    background: '#1a1a1a',
    color: '#eaeaea',
    borderLeft: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif',
    height: '100vh',
    overflowY: 'auto'
  };

  const sectionStyle = {
    padding: '1rem',
    borderBottom: '1px solid #333'
  };

  const buttonStyle = {
    background: '#3a3a3a',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    borderRadius: '4px',
    fontWeight: 'bold',
    transition: 'background 0.2s',
    marginBottom: '0.5rem',
    width: '100%'
  };

  const playButtonStyle = {
    ...buttonStyle,
    background: isPlaying ? '#ff4757' : '#2ed573',
    padding: '1rem',
    fontSize: '1.2rem'
  };

  if (isPlaying) {
    return (
      <div style={panelStyle}>
        <div style={sectionStyle}>
          <button style={playButtonStyle} onClick={togglePlay}>
            Stop Playtest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={sectionStyle}>
        <h2>Master Controls</h2>
        <button style={playButtonStyle} onClick={togglePlay}>
          ▶ Enter Play Mode
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button style={buttonStyle} onClick={exportSceneData}>Export Manifest</button>
          <label style={{ ...buttonStyle, textAlign: 'center', margin: 0, cursor: 'pointer' }}>
            Import
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3>Entities</h3>
        <button style={{...buttonStyle, background: '#3498db'}} onClick={() => addEntity('primitive')}>+ Add Primitive</button>
        <button style={{...buttonStyle, background: '#9b59b6'}} onClick={() => addEntity('sprite')}>+ Add Sprite</button>
        
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
          {entities.map(e => (
            <li 
              key={e.id} 
              style={{
                padding: '0.5rem', 
                background: selectedId === e.id ? '#333' : 'transparent',
                cursor: 'pointer',
                borderBottom: '1px solid #222',
                display: 'flex',
                justifyContent: 'space-between'
              }}
              onClick={() => setSelectedId(e.id)}
            >
              <span>{e.name}</span>
              <button 
                onClick={(ev) => { ev.stopPropagation(); removeEntity(e.id); if(selectedId === e.id) setSelectedId(null); }}
                style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
              >✕</button>
            </li>
          ))}
        </ul>
      </div>

      {selectedEntity && (
        <div style={sectionStyle}>
          <h3>Logic Inspector</h3>
          <p style={{ fontSize: '0.85rem', color: '#888' }}>ID: {selectedEntity.id}</p>
          
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Z-Index (Depth Sorting)</label>
            <input 
              type="number" 
              value={selectedEntity.visual.zIndex} 
              onChange={(e) => updateEntityVisual(selectedId, { zIndex: Number(e.target.value) })}
              style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h4>Logic Tags</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {selectedEntity.logic.tags.map(tag => (
                <span key={tag} style={{ background: '#2c3e50', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newTag} 
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g., is_player"
                style={{ flex: 1, padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
              />
              <button type="submit" style={{ ...buttonStyle, width: 'auto', margin: 0 }}>Add</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
