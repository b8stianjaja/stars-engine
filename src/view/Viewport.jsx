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
            <meshStandardMaterial map={artTexture} transparent={true} opacity={0.85} roughness={0.8} metalness={0.1} color={tintColor} />
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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (studioMode !== 'design') return;
            const key = e.key.toLowerCase();

            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            const isEditable = document.activeElement ? document.activeElement.isContentEditable : false;
            const isMonaco = document.activeElement ? document.activeElement.className.includes('monaco') : false;

            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || isEditable || isMonaco) return;

            if (key === 'w') setTransformMode('translate');
            if (key === 'r') setTransformMode('scale');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setTransformMode, studioMode]);

    const handlePointerMissed = (e) => {
        if (gizmoRef.current && gizmoRef.current.axis) return;
        if (e.target === e.currentTarget) selectEntity(null);
    };

    return (
        <>
            <PerspectiveCamera makeDefault position={currentView.position} fov={currentView.fov || 40} />
            <CameraController />

            <color attach="background" args={['#050508']} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[15, 25, 15]} intensity={2.0} castShadow shadow-mapSize={[2048, 2048]} />

            <DrawnArtProjectionPlane base64Data={canvasLayers.background_f0} offsetHeight={0.005} tintColor="#ffffff" />
            <DrawnArtProjectionPlane base64Data={canvasLayers.foreground_f0} offsetHeight={0.01} tintColor="#ffffff" />

            <group onPointerMissed={handlePointerMissed}>
                {entityIds.map((id) => (
                    <Actor key={id} id={id} sharedBuffer={sharedBuffer} worker={worker} gizmoRef={gizmoRef} />
                ))}
            </group>

            <ContactShadows position={[0, -0.005, 0]} opacity={0.6} scale={40} blur={2.0} far={5} />
            <gridHelper args={[40, 40, '#ff00aa', '#14141a']} position={[0, 0, 0]} />
        </>
    );
}