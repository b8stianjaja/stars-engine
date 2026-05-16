import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere, Cylinder, Cone, Plane, Torus } from '@react-three/drei';

export const Actor = forwardRef(({ entity, sharedBuffer, isSelected, onClick }, ref) => {
    const localRef = useRef(null);

    // Fusión segura de referencias para R3F
    const setRefs = (element) => {
        localRef.current = element;
        if (typeof ref === 'function') ref(element);
        else if (ref) ref.current = element;
    };

    useFrame(({ camera }) => {
        if (!sharedBuffer || !localRef.current) return;

        // FIX 1: Verificamos correctamente la cámara (no el parent de la malla)
        if (isSelected && camera.userData?.isDraggingGizmo) return;

        const floatArray = new Float32Array(sharedBuffer);
        const offset = entity.index * 16;

        // FIX 2: Si la memoria del Kernel aún no arranca, ignoramos el ciclo
        if (isNaN(floatArray[offset + 0])) return;

        localRef.current.position.set(
            floatArray[offset + 0],
            floatArray[offset + 1],
            floatArray[offset + 2]
        );

        localRef.current.scale.set(
            floatArray[offset + 6] !== 0 ? floatArray[offset + 6] : entity.scale[0],
            floatArray[offset + 7] !== 0 ? floatArray[offset + 7] : entity.scale[1],
            floatArray[offset + 8] !== 0 ? floatArray[offset + 8] : entity.scale[2]
        );
    });

    const materialProps = {
        color: entity.color || '#8e8e93',
        roughness: 0.4,
        metalness: 0.1,
        emissive: isSelected ? '#0071e3' : '#000000',
        emissiveIntensity: isSelected ? 0.3 : 0
    };

    // FIX 3: Retorno funcional en vez de Componente, evita desmontajes destructivos
    const renderGeometry = () => {
        switch (entity.type) {
            case 'sphere': return <Sphere args={[0.5, 32, 32]} castShadow receiveShadow><meshStandardMaterial {...materialProps} /></Sphere>;
            case 'cylinder': return <Cylinder args={[0.5, 0.5, 1, 32]} castShadow receiveShadow><meshStandardMaterial {...materialProps} /></Cylinder>;
            case 'pyramid': return <Cone args={[0.5, 1, 4]} castShadow receiveShadow><meshStandardMaterial {...materialProps} /></Cone>;
            case 'plane': return <Plane args={[1, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><meshStandardMaterial {...materialProps} /></Plane>;
            case 'torus': return <Torus args={[0.5, 0.2, 16, 32]} castShadow receiveShadow><meshStandardMaterial {...materialProps} /></Torus>;
            case 'box':
            default:
                return <Box args={[1, 1, 1]} castShadow receiveShadow><meshStandardMaterial {...materialProps} /></Box>;
        }
    };

    // Valores iniciales seguros
    const pos = [entity.position[0], entity.position[1], entity.position[2]];
    const sca = [entity.scale[0], entity.scale[1], entity.scale[2]];

    return (
        <group ref={setRefs} onClick={onClick} position={pos} scale={sca}>
            {isSelected && (
                <Box args={[1.02, 1.02, 1.02]}>
                    <meshBasicMaterial color="#0071e3" wireframe opacity={0.5} transparent />
                </Box>
            )}
            {renderGeometry()}
        </group>
    );
});