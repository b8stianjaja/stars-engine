import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function Actor({ index, buffer }) {
    const meshRef = useRef();
    const floatView = useRef(new Float32Array(buffer));

    useFrame(() => {
        if (!meshRef.current) return;
        const offset = index * 3;
        // Lectura directa de memoria compartida 
        meshRef.current.position.set(
            floatView.current[offset],
            floatView.current[offset + 1],
            floatView.current[offset + 2]
        );
    });

    return (
        <mesh ref={meshRef} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#6366f1" metalness={0.5} />
        </mesh>
    );
}