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

export function Viewport({ sharedBuffer, worker }) {
    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const activeViewId = useSystemicStore(state => state.workspace.activeViewId);
    const cameraViews = useSystemicStore(state => state.workspace.cameraViews);
    const selectEntity = useSystemicStore(state => state.selectEntity);
    const setTransformMode = useSystemicStore(state => state.setTransformMode);

    const currentView = cameraViews[activeViewId] || cameraViews['free'];

    // Puntero de referencia técnica O(1) para contener el Gizmo activo en el espacio tridimensional
    const gizmoRef = useRef(null);

    // SISTEMA DE HOTKEYS INDUSTRIAL: Alternancia en caliente de herramientas de composición
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            // Evitar conflictos si el desarrollador está escribiendo código en el Monaco Editor
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.className.includes('monaco')) {
                return;
            }
            if (key === 'w') setTransformMode('translate');
            if (key === 'r') setTransformMode('scale');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setTransformMode]);

    const handlePointerMissed = (e) => {
        // Bloqueo estricto: Si el usuario deselecciona, nos aseguramos que no esté tocando los ejes del Gizmo
        if (gizmoRef.current && gizmoRef.current.axis) return;

        if (e.target === e.currentTarget) {
            selectEntity(null);
        }
    };

    return (
        <>
            <PerspectiveCamera makeDefault position={currentView.position} fov={currentView.fov || 40} />
            <CameraController />

            <color attach="background" args={['#07070a']} />

            {/* Atmósfera Cromática Avanzada Studio para el Artista */}
            <ambientLight intensity={0.35} />
            <directionalLight position={[15, 22, 15]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
            <pointLight position={[-12, -8, -12]} intensity={0.7} color="#6366f1" />

            <group onPointerMissed={handlePointerMissed}>
                {entityIds.map((id) => (
                    <Actor
                        key={id}
                        id={id}
                        sharedBuffer={sharedBuffer}
                        worker={worker}
                        gizmoRef={gizmoRef}
                    />
                ))}
            </group>

            <ContactShadows position={[0, -0.005, 0]} opacity={0.65} scale={30} blur={2.5} far={6} />

            {/* Grilla de Andamiaje Técnico de Referencia de Dos Tonos */}
            <gridHelper args={[40, 40, '#6366f1', '#1e1e2f']} position={[0, 0, 0]} />
            <gridHelper args={[40, 8, '#ff00aa', 'transparent']} position={[0, 0.001, 0]} />
        </>
    );
}