// src/view/Viewport.jsx
import { useRef, useEffect, useState, useMemo, Suspense, memo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { TransformControls, OrbitControls, Grid, Environment } from '@react-three/drei';
import { useSystemicStore } from '../core/engine.store';
import { useShallow } from 'zustand/react/shallow';
import { Actor } from './Actor';

export const Viewport = memo(function Viewport({ sharedBuffer, worker }) {
    const { camera, gl } = useThree();

    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const transformMode = useSystemicStore(state => state.workspace.transformMode);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);

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

    // SPATIAL DELTA REGISTERS TO PREVENT LAN BACKPRESSURE CHURN
    const lastSentPos = useRef(new THREE.Vector3());
    const lastSentSca = useRef(new THREE.Vector3(1, 1, 1));
    const lastSentRot = useRef(new THREE.Quaternion());

    const globalFloatView = useMemo(() => new Float32Array(sharedBuffer), [sharedBuffer]);
    const isEditorMode = studioMode === 'design' || studioMode === 'logic';

    // --- SISTEMA DE CONTROL DE CÁMARA DE DIRECTOR ---
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

    // --- PIPELINE DE GIZMOS EMITIDO EN TIEMPO REAL CON INTEGRACIÓN BILATERAL CO-AUTHORING ---
    useEffect(() => {
        const controls = transformRef.current;
        if (!controls || !transformTarget || !selectedEntityId) return;

        const handleDraggingChanged = (event) => {
            const isDragging = event.value;
            isDraggingRef.current = isDragging;

            if (orbitRef.current) {
                orbitRef.current.enabled = !isDragging && !cameraLocked;
            }
            gl.domElement.style.cursor = isDragging ? 'grabbing' : 'default';

            if (isDragging) {
                // Initialize registers on drag onset
                lastSentPos.current.copy(transformTarget.position);
                lastSentSca.current.copy(transformTarget.scale);
                lastSentRot.current.copy(transformTarget.quaternion);
            } else {
                // Final discrete flush to commit absolute alignment values
                const pos = transformTarget.position;
                const sca = transformTarget.scale;
                const rot = transformTarget.quaternion;

                if (transformMode === 'translate') {
                    updateEntityTransform(selectedEntityId, 'position', [pos.x, pos.y, pos.z], false);
                } else if (transformMode === 'scale') {
                    updateEntityTransform(selectedEntityId, 'scale', [sca.x, sca.y, sca.z], false);
                } else if (transformMode === 'rotate') {
                    updateEntityTransform(selectedEntityId, 'quaternion', [rot.x, rot.y, rot.z, rot.w], false);
                }
            }
        };

        const handleObjectChange = () => {
            if (!isDraggingRef.current) return;

            const pos = transformTarget.position;
            const sca = transformTarget.scale;
            const rot = transformTarget.quaternion;

            const entity = useSystemicStore.getState().entities[selectedEntityId];
            if (!entity) return;

            const offset = entity.index * 16;

            if (transformMode === 'translate') {
                globalFloatView[offset + 0] = pos.x;
                globalFloatView[offset + 1] = pos.y;
                globalFloatView[offset + 2] = pos.z;

                if (worker) {
                    worker.postMessage({
                        type: 'UPDATE_PHYSICAL_POS',
                        payload: { id: selectedEntityId, x: pos.x, y: pos.y, z: pos.z }
                    });
                }

                // Spatial delta throttling rule for inter-thread mirroring stability
                if (pos.distanceTo(lastSentPos.current) >= 0.02) {
                    updateEntityTransform(selectedEntityId, 'position', [pos.x, pos.y, pos.z], false);
                    lastSentPos.current.copy(pos);
                }
            } else if (transformMode === 'scale') {
                globalFloatView[offset + 7] = sca.x;
                globalFloatView[offset + 8] = sca.y;
                globalFloatView[offset + 9] = sca.z;

                if (worker) {
                    worker.postMessage({
                        type: 'UPDATE_PHYSICAL_POS',
                        payload: { id: selectedEntityId, scaleX: sca.x, scaleY: sca.y, scaleZ: sca.z }
                    });
                }

                // Scale threshold throttling
                if (sca.distanceTo(lastSentSca.current) >= 0.02) {
                    updateEntityTransform(selectedEntityId, 'scale', [sca.x, sca.y, sca.z], false);
                    lastSentSca.current.copy(sca);
                }
            } else if (transformMode === 'rotate') {
                globalFloatView[offset + 3] = rot.x;
                globalFloatView[offset + 4] = rot.y;
                globalFloatView[offset + 5] = rot.z;
                globalFloatView[offset + 6] = rot.w;

                if (worker) {
                    worker.postMessage({
                        type: 'UPDATE_PHYSICAL_POS',
                        payload: { id: selectedEntityId, rotX: rot.x, rotY: rot.y, rotZ: rot.z, rotW: rot.w }
                    });
                }

                // Low-allocation quaternion dot product angular difference calculation
                const dotProduct = Math.abs(rot.x * lastSentRot.current.x + rot.y * lastSentRot.current.y + rot.z * lastSentRot.current.z + rot.w * lastSentRot.current.w);
                if (1.0 - dotProduct >= 0.002) {
                    updateEntityTransform(selectedEntityId, 'quaternion', [rot.x, rot.y, rot.z, rot.w], false);
                    lastSentRot.current.copy(rot);
                }
            }
        };

        controls.addEventListener('dragging-changed', handleDraggingChanged);
        controls.addEventListener('change', handleObjectChange);

        return () => {
            controls.removeEventListener('dragging-changed', handleDraggingChanged);
            controls.removeEventListener('change', handleObjectChange);
        };
    }, [transformMode, selectedEntityId, transformTarget, worker, gl.domElement, cameraLocked, updateEntityTransform, globalFloatView]);

    useEffect(() => {
        if (!selectedEntityId) setTransformTarget(null);
    }, [selectedEntityId]);

    return (
        <group>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <Environment preset="city" />

            <OrbitControls
                ref={orbitRef}
                makeDefault
                dampingFactor={0.05}
                enabled={!cameraLocked}
            />

            {showBlueprints && !cameraLocked && (
                <Grid args={[100, 100]} position={[0, -0.01, 0]} cellColor="#0071e3" sectionColor="#444444" sectionSize={1} cellSize={0.5} fadeDistance={40} />
            )}

            {isEditorMode && !cameraLocked && (
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, -0.05, 0]}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isDraggingRef.current) selectEntity(null);
                    }}
                >
                    <planeGeometry args={[500, 500]} />
                    <meshBasicMaterial visible={false} />
                </mesh>
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

            {transformTarget && selectedEntityId && isEditorMode && !cameraLocked && (
                <TransformControls ref={transformRef} object={transformTarget} mode={transformMode} size={0.8} />
            )}
        </group>
    );
});