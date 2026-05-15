import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSystemicStore } from '../core/engine.store';

export function Actor({ index, buffer, id }) {
    const meshRef = useRef();
    const floatView = useMemo(() => new Float32Array(buffer), [buffer]);
    const entityData = useSystemicStore((state) => state.entities[id]);

    useFrame(() => {
        if (!meshRef.current) return;
        const offset = index * 3;
        meshRef.current.position.set(floatView[offset], floatView[offset + 1], floatView[offset + 2]);
    });

    if (!entityData) return null;

    return (
        <mesh ref={meshRef} scale={entityData.scale}>
            {entityData.type === 'pyramid' ? <coneGeometry args={[0.707, 1, 4]} /> : <boxGeometry args={[1, 1, 1]} />}
            <meshStandardMaterial
                color={entityData.color}
                metalness={0.1}
                roughness={0.7}
            />
        </mesh>
    );
}