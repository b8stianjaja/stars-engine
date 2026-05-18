// src/components/canvas/EngineCanvas.jsx
import { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Viewport } from '../../view/Viewport';
import { EngineMemory } from '../../core/config/memory.config';

export const EngineCanvas = memo(function EngineCanvas({ worker }) {
    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true, alpha: true }}
            camera={{ position: [0, 4, 10], fov: 45 }}
        >
            <Viewport sharedBuffer={EngineMemory.physicsBuffer} worker={worker} />
        </Canvas>
    );
}, (prevProps, nextProps) => prevProps.worker === nextProps.worker);