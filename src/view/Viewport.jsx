import { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { TransformControls, OrbitControls, Grid, Environment } from '@react-three/drei';
import { useSystemicStore } from '../core/engine.store';
import { useShallow } from 'zustand/react/shallow';
import { Actor } from './Actor';

export function Viewport({ sharedBuffer, worker }) {
    const { camera, gl } = useThree();

    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const transformMode = useSystemicStore(state => state.workspace.transformMode);

    const cameraLocked = useSystemicStore(state => state.workspace.cameraLocked);
    const directorCameraData = useSystemicStore(state => state.workspace.directorCameraData);
    const saveDirectorCamera = useSystemicStore(state => state.saveDirectorCamera);
    const showBlueprints = useSystemicStore(state => state.workspace.showBlueprints);

    const selectEntity = useSystemicStore(state => state.selectEntity);
    const updateEntityTransform = useSystemicStore(state => state.updateEntityTransform);

    const transformRef = useRef(null);
    const orbitRef = useRef(null);
    const isDraggingRef = useRef(false);
    const previousLockRef = useRef(cameraLocked);
    const [transformTarget, setTransformTarget] = useState(null);

    const globalFloatView = useMemo(() => new Float32Array(sharedBuffer), [sharedBuffer]);

    useEffect(() => {
        if (cameraLocked && !previousLockRef.current) {
            saveDirectorCamera(
                [camera.position.x, camera.position.y, camera.position.z],
                [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w]
            );
        } else if (cameraLocked && directorCameraData) {
            camera.position.set(...directorCameraData.position);
            camera.quaternion.set(...directorCameraData.quaternion);
        }
        previousLockRef.current = cameraLocked;
    }, [cameraLocked, camera, saveDirectorCamera, directorCameraData]);

    useEffect(() => {
        if (transformRef.current && transformTarget) {
            const controls = transformRef.current;
            const handleDraggingChanged = (event) => {
                const isDragging = event.value;
                isDraggingRef.current = isDragging;

                if (orbitRef.current && !cameraLocked) orbitRef.current.enabled = !isDragging;
                gl.domElement.style.cursor = isDragging ? 'grabbing' : 'default';

                if (!isDragging && selectedEntityId) {
                    const pos = transformTarget.position;
                    const sca = transformTarget.scale;
                    const rot = transformTarget.quaternion;

                    if (transformMode === 'translate') {
                        updateEntityTransform(selectedEntityId, 'position', [pos.x, pos.y, pos.z]);
                        if (worker) worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: selectedEntityId, x: pos.x, y: pos.y, z: pos.z } });
                    } else if (transformMode === 'scale') {
                        updateEntityTransform(selectedEntityId, 'scale', [sca.x, sca.y, sca.z]);
                        if (worker) worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: selectedEntityId, scaleX: sca.x, scaleY: sca.y, scaleZ: sca.z } });
                    } else if (transformMode === 'rotate') {
                        if (worker) worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: selectedEntityId, rotX: rot.x, rotY: rot.y, rotZ: rot.z, rotW: rot.w } });
                    }
                }
            };

            controls.addEventListener('dragging-changed', handleDraggingChanged);
            return () => controls.removeEventListener('dragging-changed', handleDraggingChanged);
        }
    }, [transformMode, selectedEntityId, updateEntityTransform, worker, gl.domElement, transformTarget, cameraLocked]);

    return (
        <group onPointerMissed={(e) => { if (e.type === 'click') selectEntity(null); }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <Environment preset="city" />

            <OrbitControls ref={orbitRef} makeDefault dampingFactor={0.05} enabled={!cameraLocked} />

            {showBlueprints && !cameraLocked && (
                <Grid args={[100, 100]} position={[0, -0.01, 0]} cellColor="#0071e3" sectionColor="#444444" sectionSize={1} cellSize={0.5} fadeDistance={40} />
            )}

            <Suspense fallback={null}>
                {entityIds.map(id => (
                    <Actor
                        key={id}
                        id={id}
                        globalFloatView={globalFloatView}
                        isSelected={id === selectedEntityId}
                        isDraggingRef={isDraggingRef}
                        setTransformTarget={id === selectedEntityId ? setTransformTarget : null}
                        worker={worker}
                    />
                ))}
            </Suspense>

            {transformTarget && selectedEntityId && !cameraLocked && (
                <TransformControls ref={transformRef} object={transformTarget} mode={transformMode} size={0.8} />
            )}
        </group>
    );
}