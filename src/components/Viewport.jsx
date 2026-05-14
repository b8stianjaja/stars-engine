import React, { useState, useRef, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../core/stores/sceneStore';
import { ErrorBoundary } from './ErrorBoundary';

const EntityRenderer = memo(({ entity, isPlaying, isSelected, onSelect }) => {
  const updateEntityTransform = useSceneStore(state => state.updateEntityTransform);
  const transformRef = useRef(null);

  const { id, type, transform: { pos, rot, sca } } = entity;

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

  let meshContent = (
    <mesh
      position={pos}
      rotation={rot}
      scale={sca}
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
    >
      {type === 'sprite' ? <planeGeometry args={[1, 1]} /> : <boxGeometry args={[1, 1, 1]} />}
      <meshStandardMaterial
        color={isSelected ? "#00ffcc" : (entity.color || "#aaaaaa")}
        wireframe={!isPlaying}
        transparent={!isPlaying}
        opacity={isPlaying ? 1 : 0.4}
      />
    </mesh>
  );

  return (
    <>
      {!isPlaying && isSelected ? (
        <TransformControls
          ref={transformRef}
          mode="translate"
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
  const { entities, isPlaying, director } = useSceneStore(useShallow(state => ({
    entities: state.entities,
    isPlaying: state.isPlaying,
    director: state.director
  })));

  const [selectedId, setSelectedId] = useState(null);

  return (
    <div style={{ width: '100%', height: '100%', background: '#111' }}>
      <ErrorBoundary>
        <Canvas
          camera={{ position: director.activeCamera.position, fov: director.activeCamera.fov }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <ambientLight intensity={isPlaying ? 1.0 : 0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} />

          {!isPlaying && (
            <>
              <Grid infiniteGrid fadeDistance={50} sectionColor="#444" cellColor="#222" sectionSize={1} cellSize={0.5} />
              <OrbitControls makeDefault />
            </>
          )}

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