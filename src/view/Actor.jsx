import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSystemicStore } from '../core/engine.store';
import { Edges, TransformControls } from '@react-three/drei';

export function Actor({ id, sharedBuffer, worker, gizmoRef }) {
    const meshRef = useRef();
    const isDraggingRef = useRef(false);
    const settleFramesRef = useRef(0);
    const [hovered, setHovered] = useState(false);

    const floatView = useMemo(() => new Float32Array(sharedBuffer), [sharedBuffer]);

    const entityData = useSystemicStore((state) => state.entities[id]);
    const selectedEntityId = useSystemicStore((state) => state.workspace.selectedEntityId);
    const showBlueprints = useSystemicStore((state) => state.workspace.showBlueprints);
    const transformMode = useSystemicStore((state) => state.workspace.transformMode);
    const snapValue = useSystemicStore((state) => state.workspace.snapValue);

    const selectEntity = useSystemicStore((state) => state.selectEntity);
    const updateEntityTransform = useSystemicStore((state) => state.updateEntityTransform);

    const isSelected = selectedEntityId === id;

    const STRIDE = 16;
    const P_X = 0, P_Y = 1, P_Z = 2;
    const S_X = 6, S_Y = 7, S_Z = 8;
    const ROT = 9;

    useEffect(() => {
        return () => {
            if (isSelected && gizmoRef.current) gizmoRef.current = null;
        };
    }, [isSelected, gizmoRef]);

    useFrame(() => {
        if (!meshRef.current || !entityData || !floatView) return;
        const offset = entityData.index * STRIDE;

        if (isDraggingRef.current || settleFramesRef.current > 0) {
            floatView[offset + P_X] = meshRef.current.position.x;
            floatView[offset + P_Y] = meshRef.current.position.y;
            floatView[offset + P_Z] = meshRef.current.position.z;
            floatView[offset + S_X] = meshRef.current.scale.x;
            floatView[offset + S_Y] = meshRef.current.scale.y;
            floatView[offset + S_Z] = meshRef.current.scale.z;

            if (settleFramesRef.current > 0) settleFramesRef.current--;
        } else {
            meshRef.current.position.set(floatView[offset + P_X], floatView[offset + P_Y], floatView[offset + P_Z]);
            meshRef.current.scale.set(floatView[offset + S_X], floatView[offset + S_Y], floatView[offset + S_Z]);
            meshRef.current.rotation.y = floatView[offset + ROT];
        }
    });

    if (!entityData) return null;

    return (
        <>
            <mesh
                ref={meshRef}
                scale={entityData.scale}
                position={entityData.position}
                onPointerOver={(e) => { e.stopPropagation(); if (!gizmoRef.current?.axis) setHovered(true); }}
                onPointerOut={() => setHovered(false)}
                onPointerDown={(e) => { e.stopPropagation(); if (!gizmoRef.current?.axis) selectEntity(id); }}
                castShadow receiveShadow
            >
                {entityData.type === 'pyramid' ? <coneGeometry args={[0.707, 1, 4]} /> : <boxGeometry args={[1, 1, 1]} />}
                <meshStandardMaterial color={entityData.color} metalness={isSelected ? 0.4 : 0.15} roughness={isSelected ? 0.3 : 0.6} wireframe={!showBlueprints} transparent opacity={isSelected ? 0.85 : 1.0} />
                {showBlueprints && <Edges threshold={15} color={isSelected ? "#ff00aa" : hovered ? "#6366f1" : "#475569"} thickness={isSelected ? 2.5 : 1.5} />}
            </mesh>

            {isSelected && (
                <TransformControls
                    ref={(instance) => { if (instance) gizmoRef.current = instance; }}
                    object={meshRef} mode={transformMode}
                    translationSnap={snapValue > 0 && transformMode === 'translate' ? snapValue : null}
                    scaleSnap={snapValue > 0 && transformMode === 'scale' ? snapValue : null}
                    size={0.8}
                    onMouseDown={() => { isDraggingRef.current = true; }}
                    onMouseUp={() => {
                        isDraggingRef.current = false;
                        settleFramesRef.current = 10;
                        const fPos = [meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z];
                        const fScale = [meshRef.current.scale.x, meshRef.current.scale.y, meshRef.current.scale.z];

                        updateEntityTransform(id, 'position', fPos);
                        updateEntityTransform(id, 'scale', fScale);

                        if (worker) {
                            worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id, x: fPos[0], y: fPos[1], z: fPos[2], scaleX: fScale[0], scaleY: fScale[1], scaleZ: fScale[2] } });
                        }
                    }}
                    onChange={() => {
                        if (isDraggingRef.current && transformMode === 'translate' && worker) {
                            worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id, x: meshRef.current.position.x, y: meshRef.current.position.y, z: meshRef.current.position.z } });
                        }
                    }}
                />
            )}
        </>
    );
}