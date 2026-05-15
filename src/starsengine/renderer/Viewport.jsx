// src/starsengine/renderer/Viewport.jsx
import React, { useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../core/stores/engineStore';
import { useEditorStore } from '../editor/stores/editorStore';
import { DrawingSystem } from '../core/logic/DrawingSystem';
import { drawingManager } from '../core/logic/DrawingManager';
import { engineRunner } from '../core/logic/CoreRunner';

const EntityNode = ({ id }) => {
    const entity = useEngineStore(state => state.entities[id]);
    const workspaceMode = useEditorStore(state => state.workspaceMode);
    const { canvas } = DrawingSystem.getCanvas(id);

    // Textura dinámica vinculada al canvas de dibujo
    const texture = useMemo(() => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        return tex;
    }, [id, canvas]);

    // Actualización de textura en tiempo real
    useEffect(() => {
        const handleUpdate = () => { texture.needsUpdate = true; };
        window.addEventListener(`draw-update-${id}`, handleUpdate);
        return () => window.removeEventListener(`draw-update-${id}`, handleUpdate);
    }, [id, texture]);

    if (!entity) return null;

    // Manejadores de dibujo (Solo activos en Artist Mode)
    const onPointerDown = (e) => {
        if (workspaceMode !== 'artist' || !e.uv) return;
        e.stopPropagation();
        drawingManager.startStroke(id, e.uv);
    };

    const onPointerMove = (e) => {
        if (workspaceMode !== 'artist' || !e.uv) return;
        drawingManager.continueStroke(e.uv);
    };

    return (
        <group position={entity.components.Transform.pos}>
            <mesh
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => drawingManager.endStroke()}
            >
                <planeGeometry args={[5, 5]} />
                <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
            </mesh>

            {/* Esqueleto de Layout (Visible solo para referencia del artista) */}
            <mesh scale={[1.05, 1.05, 1.05]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial wireframe color="#0ea5e9" opacity={0.15} transparent />
            </mesh>
        </group>
    );
};

export function Viewport() {
    const activeSceneId = useEngineStore(state => state.activeSceneId);
    const scene = useEngineStore(state => state.scenes[activeSceneId]);
    const cameraProjection = useEditorStore(state => state.cameraProjection);
    const isCameraLocked = useEditorStore(state => state.isCameraLocked);

    const entityIds = useMemo(() => scene?.entityIds || [], [scene]);

    return (
        <Canvas shadows raycaster={{ params: { Line: { threshold: 0.15 } } }}>
            {cameraProjection === 'perspective' ? (
                <PerspectiveCamera makeDefault position={[10, 10, 10]} />
            ) : (
                <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
            )}

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Grid infiniteGrid sectionColor="#27272a" fadeDistance={50} />

            {!isCameraLocked && <OrbitControls makeDefault />}

            {entityIds.map(id => (
                <EntityNode key={id} id={id} />
            ))}
        </Canvas>
    );
}