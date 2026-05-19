// src/view/Actor.jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSystemicStore } from '../core/engine.store';
import { useShallow } from 'zustand/react/shallow';

const GEOMETRY_REGISTRY = {
    box: <boxGeometry args={[1, 1, 1]} />,
    sphere: <sphereGeometry args={[0.5, 32, 32]} />,
    cylinder: <cylinderGeometry args={[0.5, 0.5, 1, 32]} />,
    capsule: <capsuleGeometry args={[0.5, 1, 2, 16]} />,
    plane: <planeGeometry args={[1, 1]} />
};

export function Actor({ id, globalFloatView, isSelected, isDraggingRef, setTransformTarget }) {
    const meshRef = useRef(null);
    const materialRef = useRef(null);

    const entity = useSystemicStore(useShallow(state => state.entities[id]));

    // DEFENSIVE PROGRAMMING PATTERN: Resilient store slice routing abstraction
    const selectEntity = useSystemicStore(state => state.selectEntity ?? state.workspace?.selectEntity);

    const GeometryComponent = useMemo(() => {
        return GEOMETRY_REGISTRY[entity?.type] || GEOMETRY_REGISTRY['box'];
    }, [entity?.type]);

    useFrame(() => {
        if (!meshRef.current || !entity || !globalFloatView) return;

        // ANTI-JUDDER PROTECTION ENGINE: Lock matrix interpolation when local user transforms mesh via gizmos
        if (isSelected && isDraggingRef?.current) return;

        const offset = entity.index * 16;

        meshRef.current.position.set(
            globalFloatView[offset + 0],
            globalFloatView[offset + 1],
            globalFloatView[offset + 2]
        );
        meshRef.current.quaternion.set(
            globalFloatView[offset + 3],
            globalFloatView[offset + 4],
            globalFloatView[offset + 5],
            globalFloatView[offset + 6]
        );
        meshRef.current.scale.set(
            globalFloatView[offset + 7],
            globalFloatView[offset + 8],
            globalFloatView[offset + 9]
        );
    });

    if (!entity) return null;

    const baseColor = entity.color || entity.properties?.color || '#ffffff';
    const isMask = entity.isGhostMask || false;

    const handlePointerDown = (e) => {
        // Absolute containment of pointer event coordinates to shield raw raycast tracks
        e.stopPropagation();
        if (selectEntity) selectEntity(id);
    };

    return (
        <mesh
            ref={(node) => {
                meshRef.current = node;
                if (isSelected && setTransformTarget && node) {
                    setTransformTarget(node);
                }
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            castShadow={!isMask}
            receiveShadow={!isMask}
        >
            {GeometryComponent}
            <meshStandardMaterial
                ref={materialRef}
                color={isSelected ? '#0071e3' : baseColor}
                emissive={isSelected ? '#0071e3' : '#000000'}
                emissiveIntensity={isSelected ? 0.2 : 0}
                roughness={entity.properties?.roughness ?? 0.5}
                metalness={entity.properties?.metalness ?? 0.1}
                colorWrite={!isMask}
                depthWrite={true}
                transparent={isMask}
                opacity={isMask ? 0 : 1}
            />

            {/* SELECCIÓN OUTLINE HEREDADA DE BAJO NIVEL (Pure nodes to preserve absolute compile-time separation) */}
            {isSelected && (
                <mesh>
                    {GeometryComponent}
                    <meshBasicMaterial
                        color="#ffffff"
                        wireframe
                        transparent
                        opacity={0.25}
                        depthTest={false}
                    />
                </mesh>
            )}
        </mesh>
    );
}