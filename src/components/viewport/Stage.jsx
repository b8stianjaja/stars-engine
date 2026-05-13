import React, { useRef, memo, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, TransformControls, Grid, Edges, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useStore } from '../../core/store';
import { ErrorBoundary } from '../ErrorBoundary';

const CameraController = ({ isCameraLocked }) => {
  const { camera, gl } = useThree();
  const updateCamera = useStore(state => state.updateCamera);
  const activeCamera = useStore(state => state.director.activeCamera);
  const controlsRef = useRef(null);

  // Sync R3F camera to Zustand state when bookmarks change
  useEffect(() => {
    camera.position.set(...activeCamera.position);
    camera.fov = activeCamera.fov;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(...activeCamera.target);
      controlsRef.current.update();
    }
  }, [activeCamera, camera]);

  useEffect(() => {
    if (isCameraLocked) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const handleEnd = () => {
      updateCamera({ 
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fov: camera.fov
      });
    };
    
    controls.addEventListener('end', handleEnd);
    return () => controls.removeEventListener('end', handleEnd);
  }, [camera, isCameraLocked, updateCamera]);

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      enabled={!isCameraLocked} 
      domElement={gl.domElement} 
      dampingFactor={0.1}
    />
  );
};

const EntityRenderer = memo(({ entity, isPlaying, isSelected, onSelect, onInteract }) => {
  const updateEntityTransform = useStore(state => state.updateEntityTransform);
  const transformMode = useStore(state => state.transformMode);
  const meshRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  
  const { id, type, color, texture, transform: { pos, rot, sca } } = entity;

  const textureMap = useMemo(() => {
    if (!texture) return null;
    const img = new Image();
    img.src = texture;
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    img.onload = () => tex.needsUpdate = true;
    return tex;
  }, [texture]);

  const handleDragChange = (e) => {
    if (!e.value && meshRef.current) {
      // Stopped dragging, flush transform to store
      const obj = meshRef.current;
      updateEntityTransform(id, {
        pos: [obj.position.x, obj.position.y, obj.position.z],
        rot: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        sca: [obj.scale.x, obj.scale.y, obj.scale.z]
      });
    }
  };

  const getGeometry = () => {
    switch(type) {
      case 'cube': return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'pyramid': return <coneGeometry args={[0.5, 1, 4]} />;
      case 'plane': return <planeGeometry args={[1, 1]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'torus': return <torusGeometry args={[0.5, 0.2, 16, 32]} />;
      case 'capsule': return <capsuleGeometry args={[0.25, 0.5, 4, 16]} />;
      case 'tetrahedron': return <tetrahedronGeometry args={[0.5]} />;
      case 'icosahedron': return <icosahedronGeometry args={[0.5]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={[0.5]} />;
      case 'octahedron': return <octahedronGeometry args={[0.5]} />;
      default: return <boxGeometry args={[1,1,1]} />;
    }
  };

  const handleClick = (e) => {
    if (e.delta > 10) return; // Prevent accidental selection on camera drag
    e.stopPropagation();
    if (isPlaying) onInteract(id);
    else onSelect(id);
  };

  return (
    <>
      <mesh
        ref={meshRef}
        position={pos}
        rotation={rot}
        scale={sca}
        onClick={handleClick}
        onPointerOver={(e) => { 
          e.stopPropagation();
          setHovered(true);
          if(!isPlaying) document.body.style.cursor = 'pointer'; 
        }}
        onPointerOut={(e) => { 
          setHovered(false);
          if(!isPlaying) document.body.style.cursor = 'auto'; 
        }}
        castShadow
        receiveShadow
      >
        {getGeometry()}
        <meshPhysicalMaterial
          color={isSelected && !isPlaying ? "#0ea5e9" : (texture ? "#ffffff" : (color || "#64748b"))}
          map={textureMap}
          emissive={hovered && !isSelected && !isPlaying ? "#334155" : "#000000"}
          roughness={0.6}
          metalness={0.1}
          transmission={isPlaying ? (texture ? 0 : 1) : 0.1}
          thickness={0.5}
          transparent
          opacity={isPlaying ? (texture ? 1 : 0) : (isSelected ? 0.9 : 0.6)}
          alphaTest={0.1}
        />
        {!isPlaying && <Edges scale={1.001} threshold={15} color={isSelected ? "#38bdf8" : "#334155"} />}
      </mesh>

      {!isPlaying && isSelected && (
        <TransformControls
          object={meshRef}
          mode={transformMode}
          translationSnap={0.25}
          rotationSnap={Math.PI / 8}
          scaleSnap={0.25}
          onDraggingChanged={handleDragChange}
          size={0.6}
        />
      )}
    </>
  );
});

const GameLoopManager = ({ entities, isPlaying, inputKeys, updateEntityTransform }) => {
  const scriptCache = useRef({});
  const sceneScriptRef = useRef({});
  
  const switchScene = useStore(state => state.switchScene);
  const setSystemFlag = useStore(state => state.setSystemFlag);
  const getSystemFlag = useStore(state => state.systemVariables.flags);
  const sceneLogic = useStore(state => state.sceneLogic);

  // Build Engine API Object
  const engineAPI = useMemo(() => ({
    getEntities: () => useStore.getState().entities,
    switchScene: (id) => switchScene(id),
    setFlag: (key, val) => setSystemFlag(key, val),
    getFlag: (key) => useStore.getState().systemVariables.flags[key],
    triggerEvent: (id, type) => useStore.getState().triggerEvent(id, type)
  }), [switchScene, setSystemFlag]);

  useEffect(() => {
    if (!isPlaying) return;
    
    // Compile Scene Logic
    if (sceneLogic?.script) {
      try {
        const body = sceneLogic.script.replace(/export function/g, 'function');
        const code = `${body}\nreturn { onSceneStart: typeof onSceneStart !== 'undefined' ? onSceneStart : null, onSceneUpdate: typeof onSceneUpdate !== 'undefined' ? onSceneUpdate : null };`;
        sceneScriptRef.current = new Function(code)();
        
        // Execute onSceneStart
        if (sceneScriptRef.current.onSceneStart) {
          sceneScriptRef.current.onSceneStart(engineAPI);
        }
      } catch (err) {
        console.error('Scene script compile error', err);
      }
    }

    // Compile Entity Logic
    entities.forEach(ent => {
      if (ent.logic.script) {
        try {
          const body = ent.logic.script.replace(/export function/g, 'function');
          const code = `${body}\nreturn typeof onUpdate !== 'undefined' ? onUpdate : null;`;
          scriptCache.current[ent.id] = new Function(code)();
        } catch (err) {
          console.error('Script compile error on', ent.name, err);
        }
      }
    });
  }, [isPlaying, entities, sceneLogic, engineAPI]);

  useFrame((state, delta) => {
    if (!isPlaying) return;
    
    // 1. Run Scene Global Logic
    if (sceneScriptRef.current.onSceneUpdate) {
       try {
         sceneScriptRef.current.onSceneUpdate(engineAPI, inputKeys);
       } catch (err) {
         console.error('Scene runtime error', err);
       }
    }

    // 2. Run Entity Logic
    entities.forEach(ent => {
      const onUpdateFn = scriptCache.current[ent.id];
      if (onUpdateFn) {
        try {
          const mutableEnt = { ...ent, transform: { pos: [...ent.transform.pos], rot: [...ent.transform.rot], sca: [...ent.transform.sca] } };
          onUpdateFn(mutableEnt, inputKeys, engineAPI);
          if (mutableEnt.transform.pos[0] !== ent.transform.pos[0] || mutableEnt.transform.pos[1] !== ent.transform.pos[1] || mutableEnt.transform.pos[2] !== ent.transform.pos[2]) {
             updateEntityTransform(ent.id, { pos: mutableEnt.transform.pos });
          }
        } catch (err) {
          console.error('Script runtime error on', ent.name, err);
        }
      }
    });
  });

  return null;
};

export const Stage = memo(function Stage() {
  const entities = useStore(state => state.entities);
  const isPlaying = useStore(state => state.isPlaying);
  const director = useStore(state => state.director);
  const selectedEntityId = useStore(state => state.selectedEntityId);
  const setSelectedEntity = useStore(state => state.setSelectedEntity);
  const triggerEvent = useStore(state => state.triggerEvent);
  const inputKeys = useStore(state => state.inputKeys);
  const updateEntityTransform = useStore(state => state.updateEntityTransform);
  
  const pointerDownPos = useRef({ x: 0, y: 0 });

  return (
    <ErrorBoundary>
      <Canvas
        camera={{ position: director.activeCamera.position, fov: director.activeCamera.fov }}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMissed={(e) => {
          if (!isPlaying && e.type === 'click') {
            const dx = e.clientX - pointerDownPos.current.x;
            const dy = e.clientY - pointerDownPos.current.y;
            if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
              setSelectedEntity(null);
            }
          }
        }}
        gl={{ preserveDrawingBuffer: true, alpha: true }} // Alpha true lets the board background show
        style={{ background: 'transparent' }}
      >
        <GameLoopManager entities={entities} isPlaying={isPlaying} inputKeys={inputKeys} updateEntityTransform={updateEntityTransform} />
        
        <ambientLight intensity={isPlaying ? 1.0 : 0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        <hemisphereLight skyColor="#ffffff" groundColor="#000000" intensity={0.5} />
        
        {!isPlaying && (
          <>
            <Grid infiniteGrid fadeDistance={50} sectionColor="#334155" cellColor="#0f172a" sectionSize={1} cellSize={0.5} />
            <CameraController isCameraLocked={director.isCameraLocked} />
            <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
              <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="#ffffff" />
            </GizmoHelper>
          </>
        )}

        <group name="GreyboxLayer">
          {entities.map(entity => (
            <EntityRenderer
              key={entity.id}
              entity={entity}
              isPlaying={isPlaying}
              isSelected={selectedEntityId === entity.id}
              onSelect={setSelectedEntity}
              onInteract={(id) => triggerEvent(id, 'interact')}
            />
          ))}
        </group>
      </Canvas>
    </ErrorBoundary>
  );
});
