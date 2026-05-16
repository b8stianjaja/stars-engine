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

    // Suscripción atómica filtrada para evitar ciclos de re-renderizado infinito durante el drag
    const activeViewId = useSystemicStore(state => state.workspace.activeViewId);
    const updateCustomCameraTransform = useSystemicStore(state => state.updateCustomCameraTransform);

    useEffect(() => {
        if (!controlsRef.current) return;

        // Adquisición síncrona mediante snapshot no reactivo para romper bucles circulares
        const cameraViews = useSystemicStore.getState().workspace.cameraViews;
        const targetView = cameraViews[activeViewId];
        if (!targetView) return;

        camera.position.fromArray(targetView.position);
        controlsRef.current.target.fromArray(targetView.target);
        camera.fov = targetView.fov || 40;
        camera.updateProjectionMatrix();

        // Control dinámico de rotación axial DCC según el tipo de proyección
        controlsRef.current.enableRotate = !targetView.isFixed;
        controlsRef.current.update();
    }, [activeViewId, camera]);

    const handleCameraChange = () => {
        if (!controlsRef.current) return;

        if (activeViewId === 'free') {
            const pos = [camera.position.x, camera.position.y, camera.position.z];
            const target = [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z];

            // Persistencia silenciosa del transform en el almacén global
            updateCustomCameraTransform('free', pos, target);
        }
    };

    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            onChange={handleCameraChange}
        />
    );
}

function CameraLayerPlane({ base64Data, orientation, layerIndex }) {
    const [texture, setTexture] = useState(null);

    useEffect(() => {
        if (!base64Data) {
            setTexture(null);
            return;
        }
        const img = new Image();
        img.src = base64Data;
        img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.needsUpdate = true;
            setTexture(tex);
        };
    }, [base64Data]);

    if (!texture) return null;

    let rotation = [0, 0, 0];
    let position = [0, 0, 0];
    const stepOffset = layerIndex * 0.15;

    if (orientation === 'horizontal') {
        rotation = [-Math.PI / 2, 0, 0];
        position = [0, 0.01 + stepOffset, 0];
    } else if (orientation === 'vertical-z') {
        rotation = [0, 0, 0];
        position = [0, 0, 0.01 + stepOffset];
    } else if (orientation === 'vertical-x') {
        rotation = [0, -Math.PI / 2, 0];
        position = [0.01 + stepOffset, 0, 0];
    }

    return (
        <mesh rotation={rotation} position={position} receiveShadow castShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial
                map={texture}
                transparent={true}
                opacity={0.9}
                roughness={0.7}
                metalness={0.1}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

function SpatialCanvasMatrix() {
    const canvasLayers = useSystemicStore(state => state.canvasLayers);
    const cameraViews = useSystemicStore(state => state.workspace.cameraViews);
    const currentFrameIndex = useSystemicStore(state => state.layerPlayback.currentFrameIndex);

    return (
        <group>
            {Object.keys(cameraViews).map((viewId) => {
                const config = cameraViews[viewId];
                const viewData = canvasLayers[viewId] || {};
                const layers = ['background', 'midground', 'foreground'];

                return (
                    <group key={viewId}>
                        {layers.map((layerKey, idx) => {
                            const frames = viewData[layerKey] || [];
                            const frameData = frames[currentFrameIndex] || frames[frames.length - 1];
                            if (!frameData) return null;

                            return (
                                <CameraLayerPlane
                                    key={layerKey}
                                    base64Data={frameData}
                                    orientation={config.orientation}
                                    layerIndex={idx}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </group>
    );
}

export function Viewport({ sharedBuffer, worker }) {
    const entityIds = useSystemicStore(useShallow(state => Object.keys(state.entities)));
    const activeViewId = useSystemicStore(state => state.workspace.activeViewId);
    const studioMode = useSystemicStore(state => state.workspace.studioMode);
    const cameraViews = useSystemicStore(state => state.workspace.cameraViews);

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

            <SpatialCanvasMatrix />

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