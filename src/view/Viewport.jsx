import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
// 1. IMPORTANTE: Añadimos OrbitControls a la importación de Drei
import { TransformControls, OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import { useSystemicStore } from '../core/engine.store';
import { Actor } from './Actor';

export function Viewport({ sharedBuffer, worker }) {
    const { camera, gl, scene } = useThree();

    const entities = useSystemicStore(state => state.entities);
    const selectedEntityId = useSystemicStore(state => state.workspace.selectedEntityId);
    const transformMode = useSystemicStore(state => state.workspace.transformMode);
    const snapValue = useSystemicStore(state => state.workspace.snapValue);
    const showBlueprints = useSystemicStore(state => state.workspace.showBlueprints);

    const selectEntity = useSystemicStore(state => state.selectEntity);
    const updateEntityTransform = useSystemicStore(state => state.updateEntityTransform);

    const transformRef = useRef(null);
    const orbitRef = useRef(null); // 2. Referencia para la cámara orbital
    const [transformTarget, setTransformTarget] = useState(null);

    // Soporte nativo para alternar Tema Oscuro / Claro en tiempo real
    useEffect(() => {
        const updateBackground = () => {
            const isDark = document.documentElement.classList.contains('dark-theme');
            scene.background = new THREE.Color(isDark ? '#161617' : '#f5f5f7');
        };
        updateBackground();
        const observer = new MutationObserver(updateBackground);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [scene]);

    // CONTROL ANTIVIBRACIÓN (Anti-Judder) y GESTIÓN DE CONFLICTOS DE CÁMARA
    useEffect(() => {
        if (transformRef.current && transformTarget) {
            const controls = transformRef.current;

            const handleDraggingChanged = (event) => {
                const isDragging = event.value;
                camera.userData.isDraggingGizmo = isDragging;

                // 3. AISLAMIENTO: Bloquear la cámara si estamos arrastrando el Gizmo
                if (orbitRef.current) {
                    orbitRef.current.enabled = !isDragging;
                }

                gl.domElement.style.cursor = isDragging ? 'grabbing' : 'default';

                if (!isDragging && selectedEntityId) {
                    const pos = transformTarget.position;
                    const sca = transformTarget.scale;

                    if (transformMode === 'translate') {
                        updateEntityTransform(selectedEntityId, 'position', [pos.x, pos.y, pos.z]);
                        if (worker) worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: selectedEntityId, x: pos.x, y: pos.y, z: pos.z } });
                    } else if (transformMode === 'scale') {
                        updateEntityTransform(selectedEntityId, 'scale', [sca.x, sca.y, sca.z]);
                        if (worker) worker.postMessage({ type: 'UPDATE_PHYSICAL_POS', payload: { id: selectedEntityId, scaleX: sca.x, scaleY: sca.y, scaleZ: sca.z } });
                    }
                }
            };

            controls.addEventListener('dragging-changed', handleDraggingChanged);
            return () => controls.removeEventListener('dragging-changed', handleDraggingChanged);
        }
    }, [transformMode, selectedEntityId, updateEntityTransform, worker, gl.domElement, transformTarget, camera]);

    return (
        <group onPointerMissed={(e) => { if (e.type === 'click') selectEntity(null); }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <Environment preset="city" />

            {/* 4. CÁMARA LIBRE: Incorporada y asignada como predeterminada */}
            <OrbitControls
                ref={orbitRef}
                makeDefault
                dampingFactor={0.05} // Movimiento suave e inercial estilo Apple
                minDistance={1}
                maxDistance={50}
            />

            {showBlueprints && (
                <Grid args={[100, 100]} position={[0, -0.01, 0]} cellColor="#0071e3" sectionColor="#86868b" sectionSize={1} cellSize={0.5} fadeDistance={40} fadeStrength={1} />
            )}

            <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={50} blur={2} far={10} />

            {Object.entries(entities).map(([id, entity]) => {
                const isSelected = id === selectedEntityId;
                return (
                    <Actor
                        key={id}
                        entity={entity}
                        sharedBuffer={sharedBuffer}
                        isSelected={isSelected}
                        ref={isSelected ? setTransformTarget : null}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!camera.userData.isDraggingGizmo) {
                                selectEntity(id);
                            }
                        }}
                    />
                );
            })}

            {transformTarget && selectedEntityId && (
                <TransformControls
                    ref={transformRef}
                    object={transformTarget}
                    mode={transformMode}
                    translationSnap={snapValue > 0 ? snapValue : null}
                    scaleSnap={snapValue > 0 ? snapValue : null}
                    size={0.8}
                />
            )}
        </group>
    );
}