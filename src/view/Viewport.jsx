import { useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PerspectiveCamera, OrbitControls, ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSystemicStore } from '../core/engine.store';
import { Actor } from './Actor';
import * as THREE from 'three';

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

function DrawnArtProjectionPlane({ base64Data, offsetHeight, tintColor }) {
    const [artTexture, setArtTexture] = useState(null);

    useEffect(() => {
        if (!base64Data) {
            setArtTexture(null);
            return;
        }

        const imageElement = new Image();
        imageElement.src = base64Data;
        imageElement.onload = () => {
            const texture = new THREE.Texture(imageElement);
            texture.needsUpdate = true;
            setArtTexture(texture);
        };
    }, [base64Data]);

    if (!artTexture) return null;

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, offsetHeight, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial
                map={artTexture}
                transparent={true}
                opacity={0.85}
                roughness={0.8}
                metalness={0.1}
                color={tintColor}
            />
        </mesh>
    );
}

export function Viewport({ sharedBuffer, worker }) {
    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const activeViewId = useSystemicStore(state => state.workspace.activeViewId);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);
    const cameraViews = useSystemicStore(state => state.workspace.cameraViews);
    const canvasLayers = useSystemicStore(useShallow(state => state.canvasLayers));

    const selectEntity = useSystemicStore(state => state.selectEntity);
    const setTransformMode = useSystemicStore(state => state.setTransformMode);

    const currentView = cameraViews[activeViewId] || cameraViews['free'];
    const gizmoRef = useRef(null);

    // Bloqueo de atajos CAD si el artista no está en su estudio correspondiente
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (studioMode !== 'artist') return;
            const key = e.key.toLowerCase();
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.className.includes('monaco')) {
                return;
            }
            if (key === 'w') setTransformMode('translate');
            if (key === 'r') setTransformMode('scale');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.window.removeEventListener('keydown', handleKeyDown);
    }, [setTransformMode, studioMode]);

    const handlePointerMissed = (e) => {
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

            <ambientLight intensity={0.35} />
            <directionalLight position={[15, 22, 15]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
            <pointLight position={[-12, -8, -12]} intensity={0.7} color={studioMode === 'artist' ? "#ff00aa" : "#6366f1"} />

            <DrawnArtProjectionPlane base64Data={canvasLayers.background} offsetHeight={0.005} tintColor="#ffffff" />
            <DrawnArtProjectionPlane base64Data={canvasLayers.foreground} offsetHeight={0.01} tintColor="#ffffff" />

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

            <gridHelper args={[40, 40, studioMode === 'artist' ? '#ff00aa' : '#6366f1', '#1a1a24']} position={[0, 0, 0]} />
        </>
    );
}