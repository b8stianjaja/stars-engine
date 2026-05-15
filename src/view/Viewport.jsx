import { useState, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PerspectiveCamera, OrthographicCamera, OrbitControls, ContactShadows } from '@react-three/drei';
import { useSystemicStore } from '../core/engine.store';
import { Actor } from './Actor';

/**
 * Viewport corregido. Se elimina la carga externa de HDR que causaba el error de stream
 * debido a las políticas de seguridad de hilos compartidos.
 */
export function Viewport({ sharedBuffer }) {
    const entityIds = useSystemicStore(
        useShallow((state) => Object.keys(state.entities))
    );

    const [cameraMode] = useState('perspective');

    return (
        <Suspense fallback={null}>
            {/* Cámaras según especificación [cite: 19] */}
            {cameraMode === 'perspective' ? (
                <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={45} />
            ) : (
                <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={50} />
            )}

            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />

            {/* Iluminación Local (Evita errores de ReadableStream externos) */}
            <color attach="background" args={['#050505']} />
            <ambientLight intensity={0.4} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={1} />

            {/* Renderizado de Actores con suscripción transitoria [cite: 16] */}
            {entityIds.map((id, index) => (
                <Actor
                    key={id}
                    index={index}
                    buffer={sharedBuffer}
                />
            ))}

            <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
            <gridHelper args={[20, 20, 0x222222, 0x111111]} />
        </Suspense>
    );
}