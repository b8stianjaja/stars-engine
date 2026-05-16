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
    const paintMode = useSystemicStore(state => state.layerPlayback.paintMode);
    const updateCustomCameraTransform = useSystemicStore(state => state.updateCustomCameraTransform);

    useEffect(() => {
        if (!controlsRef.current) return;
        const cameraViews = useSystemicStore.getState().workspace.cameraViews;
        const targetView = cameraViews[activeViewId];
        if (!targetView) return;

        camera.position.fromArray(targetView.position);
        controlsRef.current.target.fromArray(targetView.target);
        camera.fov = targetView.fov || 40;
        camera.updateProjectionMatrix();

        // Bloquear órbita si el modo calco sobre la plantilla de referencia está activo
        controlsRef.current.enableRotate = !targetView.isFixed && !paintMode;
        controlsRef.current.update();
    }, [activeViewId, camera, paintMode]);

    const handleCameraChange = () => {
        if (activeViewId === 'free' && controlsRef.current) {
            const pos = [camera.position.x, camera.position.y, camera.position.z];
            const target = [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z];
            updateCustomCameraTransform('free', pos, target);
        }
    };

    return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} onChange={handleCameraChange} />;
}

function TransparentReferenceBillboard({ base64Frames, layerIndex }) {
    const [texture, setTexture] = useState(null);
    const { camera } = useThree();
    const currentFrameIndex = useSystemicStore(state => state.layerPlayback.currentFrameIndex);

    const frames = base64Frames || [];
    const frameData = frames[currentFrameIndex] || frames[frames.length - 1];

    useEffect(() => {
        if (!frameData) {
            setTexture(null);
            return;
        }
        const img = new Image();
        img.src = frameData;
        img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.needsUpdate = true;
            setTexture(tex);
        };
    }, [frameData]);

    if (!texture) return null;

    // Colocar el dibujo del artista en un plano semi-translúcido frente a la cámara de referencia
    const distance = 10 - (layerIndex * 0.1);
    return (
        <mesh position={[0, 0, -distance]}>
            <planeGeometry args={[12, 12]} />
            <meshBasicMaterial map={texture} transparent opacity={0.85} depthWrite={false} />
        </mesh>
    );
}

export function Viewport({ sharedBuffer, worker }) {
    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const activeViewId = useSystemicStore(state => state.workspace.activeViewId);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);
    const cameraViews = useSystemicStore(state => state.workspace.cameraViews);
    const canvasLayers = useSystemicStore(useShallow(state => state.canvasLayers));
    const paintMode = useSystemicStore(state => state.layerPlayback.paintMode);
    const opacityGuide = useSystemicStore(state => state.layerPlayback.opacityGuide);

    const selectEntity = useSystemicStore(state => state.selectEntity);
    const setTransformMode = useSystemicStore(state => state.setTransformMode);

    const currentView = cameraViews[activeViewId] || cameraViews['free'];
    const gizmoRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (studioMode !== 'design' || paintMode) return;
            const key = e.key.toLowerCase();
            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

            if (key === 'w') setTransformMode('translate');
            if (key === 'r') setTransformMode('scale');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setTransformMode, studioMode, paintMode]);

    const activeViewData = canvasLayers[activeViewId] || {};

    return (
        <>
            <PerspectiveCamera makeDefault position={currentView.position} fov={currentView.fov || 40} />
            <CameraController />

            <color attach="background" args={['#030306']} />
            <ambientLight intensity={0.3 + (1 - opacityGuide) * 0.4} />
            <directionalLight position={[15, 30, 15]} intensity={1.5} castShadow />

            {/* Renderizado de la estructura volumétrica de andamiaje */}
            <group style={{ opacity: paintMode ? opacityGuide : 1.0 }}>
                <group onPointerMissed={() => { if (!gizmoRef.current?.axis) selectEntity(null); }}>
                    {entityIds.map((id) => (
                        <Actor key={id} id={id} sharedBuffer={sharedBuffer} worker={worker} gizmoRef={gizmoRef} />
                    ))}
                </group>
            </group>

            {/* Capas de previsualización de ilustración fija integradas al viewport */}
            {!paintMode && (
                <group>
                    {['background', 'midground', 'foreground'].map((key, idx) => (
                        <TransparentReferenceBillboard key={key} base64Frames={activeViewData[key]} layerIndex={idx} />
                    ))}
                </group>
            )}

            <ContactShadows position={[0, -0.005, 0]} opacity={0.5} scale={40} blur={2} far={4} />
            <gridHelper args={[50, 50, '#ff00aa', '#111116']} position={[0, 0, 0]} />
        </>
    );
}