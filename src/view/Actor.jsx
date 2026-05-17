import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere, Cylinder, Cone, Plane, Torus, useTexture } from '@react-three/drei';
import { useSystemicStore } from '../core/engine.store';
import heroAsset from '../assets/hero.png';

const SpriteRenderer = ({ color }) => {
    const texture = useTexture(heroAsset);
    return (
        <Plane args={[1, 1.5]} castShadow receiveShadow>
            <meshStandardMaterial
                map={texture}
                color={color || '#ffffff'}
                transparent={true}
                alphaTest={0.5}
                side={2}
            />
        </Plane>
    );
};

export const Actor = ({ id, globalFloatView, isSelected, isDraggingRef, setTransformTarget, worker }) => {
    const localRef = useRef(null);

    const entity = useSystemicStore(state => state.entities[id]);
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);
    const cameraLocked = useSystemicStore(state => state.workspace.cameraLocked);

    useEffect(() => {
        if (isSelected && setTransformTarget && localRef.current) {
            setTransformTarget(localRef.current);
        }
    }, [isSelected, setTransformTarget, id]);

    useFrame(() => {
        if (!globalFloatView || !localRef.current || !entity) return;
        if (isSelected && isDraggingRef.current) return;

        const offset = entity.index * 16;
        if (isNaN(globalFloatView[offset + 0])) return;

        localRef.current.position.set(
            globalFloatView[offset + 0],
            globalFloatView[offset + 1],
            globalFloatView[offset + 2]
        );

        if (entity.type === 'sprite') {
            localRef.current.quaternion.set(0, 0, 0, 1);
        } else {
            localRef.current.quaternion.set(
                globalFloatView[offset + 3] ?? 0,
                globalFloatView[offset + 4] ?? 0,
                globalFloatView[offset + 5] ?? 0,
                globalFloatView[offset + 6] ?? 1
            );
        }

        localRef.current.scale.set(
            globalFloatView[offset + 7] !== 0 ? globalFloatView[offset + 7] : (entity.scale?.[0] ?? 1),
            globalFloatView[offset + 8] !== 0 ? globalFloatView[offset + 8] : (entity.scale?.[1] ?? 1),
            globalFloatView[offset + 9] !== 0 ? globalFloatView[offset + 9] : (entity.scale?.[2] ?? 1)
        );
    });

    if (!entity) return null;

    const isEditorMode = studioMode === 'design' || studioMode === 'logic';

    const getMaterial = () => {
        if (entity.isGhostMask && (!isEditorMode || cameraLocked)) {
            return <meshBasicMaterial colorWrite={false} depthWrite={true} />;
        }
        return (
            <meshStandardMaterial
                color={entity.color || '#8e8e93'}
                roughness={0.5}
                transparent={entity.isGhostMask}
                opacity={entity.isGhostMask ? 0.3 : 1}
                emissive={isSelected ? '#0071e3' : '#000000'}
                emissiveIntensity={isSelected ? 0.3 : 0}
            />
        );
    };

    const renderGeometry = () => {
        if (entity.type === 'sprite') {
            return <SpriteRenderer color={entity.color} />;
        }

        const material = getMaterial();
        switch (entity.type) {
            case 'sphere': return <Sphere args={[0.5, 32, 32]} castShadow receiveShadow>{material}</Sphere>;
            case 'cylinder': return <Cylinder args={[0.5, 0.5, 1, 32]} castShadow receiveShadow>{material}</Cylinder>;
            case 'pyramid': return <Cone args={[0.5, 1, 4]} castShadow receiveShadow>{material}</Cone>;
            case 'plane': return <Plane args={[1, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>{material}</Plane>;
            case 'torus': return <Torus args={[0.5, 0.2, 16, 32]} castShadow receiveShadow>{material}</Torus>;
            case 'box':
            default: return <Box args={[1, 1, 1]} castShadow receiveShadow>{material}</Box>;
        }
    };

    const handleClick = (e) => {
        e.stopPropagation();

        // AHORA PERMITE SELECCIÓN EN AMBOS ENTORNOS DE EDICIÓN
        if (isEditorMode && !cameraLocked) {
            if (!isDraggingRef.current) {
                selectEntity(id);
            }
        } else {
            if (worker) {
                worker.postMessage({
                    type: 'SPATIAL_CLICK',
                    payload: { id: id, point: { x: e.point.x, y: e.point.y, z: e.point.z } }
                });
            }
        }
    };

    const pos = [entity.position?.[0] ?? 0, entity.position?.[1] ?? 0, entity.position?.[2] ?? 0];
    const sca = [entity.scale?.[0] ?? 1, entity.scale?.[1] ?? 1, entity.scale?.[2] ?? 1];

    return (
        <group ref={localRef} onClick={handleClick} position={pos} scale={sca}>
            {isSelected && isEditorMode && !cameraLocked && (
                <Box args={[1.04, 1.04, 1.04]}>
                    <meshBasicMaterial color="#0071e3" wireframe opacity={0.4} transparent />
                </Box>
            )}
            {renderGeometry()}
        </group>
    );
};