// src/starsengine/renderer/HybridSprite.jsx
import React, { useMemo } from 'react';
import * as THREE from 'three';

export function HybridSprite({ entity }) {
    const { atlas, frame, layer, visible } = entity.components.Sprite;

    // Shader personalizado para preservar el color artesanal pero respetar profundidad
    const material = useMemo(() => new THREE.MeshBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        // Aquí se inyectaría la textura del atlas cargada dinámicamente
        color: visible ? 'white' : 'transparent'
    }), [visible]);

    return (
        <mesh renderOrder={layer}>
            <planeGeometry args={[1, 1]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}