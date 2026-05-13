import React, { useState, useRef, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../core/store';
import { ErrorBoundary } from './ErrorBoundary';

// Use React.memo for hot-swapping and stable identity
const EntityRenderer = memo(({ entity, isPlaying, isSelected, onSelect }) => {
  const updateEntityTransform = useStore(state => state.updateEntityTransform);
  const transformRef = useRef(null);
  
  const { id, type, transform: { pos, rot, sca }, visual: { zIndex } } = entity;

  // Handle updates from TransformControls
  const handleTransformChange = () => {
    if (transformRef.current && transformRef.current.object) {
      const obj = transformRef.current.object;
      updateEntityTransform(id, {
        pos: [obj.position.x, obj.position.y, obj.position.z],
        rot: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        sca: [obj.scale.x, obj.scale.y, obj.scale.z]
      });
    }
  };

  // Build the visual component based on type
  let meshContent;
  if (type === 'primitive') {
    meshContent = (
      <mesh
        position={pos}
        rotation={rot}
        scale={sca}
        renderOrder={zIndex}
        onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      >
        <boxGeometry args={[1, 1, 1, 2, 2, 2]} />
        <meshStandardMaterial
          color={isSelected ? "#00ffcc" : "#aaaaaa"}
          wireframe={!isPlaying}
          transparent={!isPlaying}
          opacity={isPlaying ? 1 : 0.1}
          depthTest={false} // Often necessary for strict 2.5D renderOrder sorting
        />
      </mesh>
    );
  } else if (type === 'sprite') {
    meshContent = (
      <mesh
        position={pos}
        rotation={rot}
        scale={sca}
        renderOrder={zIndex}
        onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial 
          color={isSelected ? "#00ffcc" : "#ffffff"} 
          wireframe={!isPlaying}
          transparent
          depthTest={false}
        />
      </mesh>
    );
  }

  return (
    <>
      {/* TransformControls for the selected entity, only in Edit mode */}
      {!isPlaying && isSelected ? (
        <TransformControls
          ref={transformRef}
          mode="translate"
          translationSnap={0.5} // Grid-snapping precision
          rotationSnap={Math.PI / 8}
          scaleSnap={0.5}
          onMouseUp={handleTransformChange}
        >
          {meshContent}
        </TransformControls>
      ) : (
        meshContent
      )}
    </>
  );
});

export function Viewport() {
  const entities = useStore(state => state.entities);
  const isPlaying = useStore(state => state.isPlaying);
  const director = useStore(state => state.director);
  
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div style={{ width: '100%', height: '100%', background: '#111' }}>
      <ErrorBoundary>
        <Canvas
          camera={{ 
            position: director.activeCamera.position, 
            fov: director.activeCamera.fov 
          }}
          onPointerMissed={() => setSelectedId(null)}
        >
          {/* Ambient & Directional light for scene context */}
          <ambientLight intensity={isPlaying ? 1.0 : 0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          
          {/* Reference Volumes & Editor UI hidden during Play Mode */}
          {!isPlaying && (
            <>
              <Grid
                infiniteGrid
                fadeDistance={50}
                sectionColor="#444"
                cellColor="#222"
                sectionSize={1}
                cellSize={0.5}
              />
              {/* Only allow orbit when not transforming */}
              <OrbitControls makeDefault />
            </>
          )}

          {/* Scene Assembler */}
          <group>
            {entities.map(entity => (
              <EntityRenderer
                key={entity.id}
                entity={entity}
                isPlaying={isPlaying}
                isSelected={selectedId === entity.id}
                onSelect={setSelectedId}
              />
            ))}
          </group>

        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
