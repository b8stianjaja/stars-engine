import { useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PerspectiveCamera, OrbitControls, ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSystemicStore } from '../core/engine.store';
import { Actor } from './Actor';

function CameraController() {
    const { camera } = useThree();
    const controlsRef = useRef();

    const activeViewId = useSystemicStore(state => state.workspace.activeViewId);
    const cameraViews = useSystemicStore(state => state.workspace.cameraViews);

    useEffect(() => {
        if (!controlsRef.current) return;
        const targetView = cameraViews[activeViewId];
        if (!targetView) return;

        if (activeViewId === 'free') {
            controlsRef.current.enabled = true;
        } else {
            // El lente se congela en las coordenadas de composición exactas del artista
            controlsRef.current.enabled = false;
            camera.position.fromArray(targetView.position);
            controlsRef.current.target.fromArray(targetView.target);
            camera.fov = targetView.fov || 40;
            camera.updateProjectionMatrix();
            controlsRef.current.update();
        }
    }, [activeViewId, cameraViews, camera]);

    return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} />;
}

export function Viewport({ sharedBuffer }) {
    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const activeViewId = useSystemicStore(state => state.workspace.activeViewId);
    const cameraViews = useSystemicStore(state => state.workspace.cameraViews);

    const currentView = cameraViews[activeViewId] || cameraViews['free'];

    return (
        <>
            <PerspectiveCamera makeDefault position={currentView.position} fov={currentView.fov || 40} />
            <CameraController />

            <color attach="background" args={['#07070a']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow />

            <group>
                {entityIds.map((id, index) => (
                    <Actor key={id} id={id} index={index} buffer={sharedBuffer} />
                ))}
            </group>

            <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
            <gridHelper args={[20, 20, 0x222230, 0x111116]} />
        </>
    );
}