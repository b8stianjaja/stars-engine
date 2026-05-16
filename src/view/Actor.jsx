import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSystemicStore } from '../core/engine.store';
import { Edges, TransformControls } from '@react-three/drei';

export function Actor({ id, sharedBuffer, worker, gizmoRef }) {
    const meshRef = useRef();
    const isDraggingRef = useRef(false);
    const [hovered, setHovered] = useState(false);

    const floatView = useMemo(() => new Float32Array(sharedBuffer), [sharedBuffer]);

    const entityData = useSystemicStore((state) => state.entities[id]);
    const selectedEntityId = useSystemicStore((state) => state.workspace.selectedEntityId);
    const showBlueprints = useSystemicStore((state) => state.workspace.showBlueprints);
    const transformMode = useSystemicStore((state) => state.workspace.transformMode);
    const snapValue = useSystemicStore((state) => state.workspace.snapValue);

    const selectEntity = useSystemicStore((state) => state.selectEntity);
    const updateEntityTransform = useSystemicStore((state) => state.updateEntityTransform);

    const isSelected = selectedEntityId === id;

    useEffect(() => {
        return () => {
            if (isSelected && gizmoRef.current) {
                gizmoRef.current = null;
            }
        };
    }, [isSelected, gizmoRef]);

    useFrame(() => {
        if (!meshRef.current || !entityData) return;
        const offset = entityData.index * 3;

        if (isDraggingRef.current) {
            // TRANSMISIÓN DEL ARTISTA: Escribimos las coordenadas manipuladas directo al SharedArrayBuffer
            floatView[offset] = meshRef.current.position.x;
            floatView[offset + 1] = meshRef.current.position.y;
            floatView[offset + 2] = meshRef.current.position.z;
        } else {
            // TRANSMISIÓN DEL DESARROLLADOR: Leemos los cálculos deterministas a 60Hz del Logic Kernel
            meshRef.current.position.set(floatView[offset], floatView[offset + 1], floatView[offset + 2]);
        }
    });

    if (!entityData) return null;

    const handlePointerOver = (e) => {
        e.stopPropagation();
        if (gizmoRef.current && gizmoRef.current.axis) return;
        setHovered(true);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = (e) => {
        if (gizmoRef.current && gizmoRef.current.axis) return;
        setHovered(false);
        document.body.style.cursor = 'default';
    };

    const handlePointerDown = (e) => {
        e.stopPropagation();
        if (gizmoRef.current && gizmoRef.current.axis) return;
        selectEntity(id);
    };

    return (
        <>
            <mesh
                ref={meshRef}
                scale={entityData.scale}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onPointerDown={handlePointerDown}
                castShadow
                receiveShadow
            >
                {entityData.type === 'pyramid' ? <coneGeometry args={[0.707, 1, 4]} /> : <boxGeometry args={[1, 1, 1]} />}
                <meshStandardMaterial
                    color={entityData.color}
                    metalness={isSelected ? 0.4 : 0.15}
                    roughness={isSelected ? 0.35 : 0.65}
                    wireframe={!showBlueprints}
                    transparent
                    opacity={isSelected ? 0.88 : 1.0}
                />

                {showBlueprints && (
                    <Edges
                        threshold={15}
                        color={isSelected ? "#ff00aa" : hovered ? "#6366f1" : "#475569"}
                        thickness={isSelected ? 2.5 : hovered ? 1.5 : 1}
                    />
                )}
            </mesh>

            {isSelected && (
                <TransformControls
                    ref={(instance) => {
                        if (instance) gizmoRef.current = instance;
                    }}
                    object={meshRef}
                    mode={transformMode}
                    translationSnap={snapValue > 0 && transformMode === 'translate' ? snapValue : null}
                    scaleSnap={snapValue > 0 && transformMode === 'scale' ? snapValue : null}
                    size={0.8}
                    onMouseDown={() => {
                        isDraggingRef.current = true;
                    }}
                    onMouseUp={() => {
                        isDraggingRef.current = false;

                        const finalPos = [meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z];
                        const finalScale = [meshRef.current.scale.x, meshRef.current.scale.y, meshRef.current.scale.z];

                        // 1. Asentar de forma inmutable los valores espaciales finales en el Store paramétrico
                        updateEntityTransform(id, 'position', finalPos);
                        updateEntityTransform(id, 'scale', finalScale);

                        // 2. Despachar coordenadas estables y dimensiones finales al Logic Kernel
                        if (worker) {
                            worker.postMessage({
                                type: 'UPDATE_PHYSICAL_POS',
                                payload: {
                                    id,
                                    x: finalPos[0], y: finalPos[1], z: finalPos[2],
                                    scaleX: finalScale[0], scaleY: finalScale[1], scaleZ: finalScale[2]
                                }
                            });
                        }
                    }}
                    onChange={() => {
                        // Sincronización continua en caliente de baja latencia durante traducción
                        if (isDraggingRef.current && transformMode === 'translate' && worker) {
                            worker.postMessage({
                                type: 'UPDATE_PHYSICAL_POS',
                                payload: {
                                    id,
                                    x: meshRef.current.position.x,
                                    y: meshRef.current.position.y,
                                    z: meshRef.current.position.z
                                }
                            });
                        }
                    }}
                />
            )}
        </>
    );
}