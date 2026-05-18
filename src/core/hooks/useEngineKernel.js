// src/core/hooks/useEngineKernel.js
import { useEffect, useState, useRef } from 'react';
import { useSystemicStore } from '../engine.store';
import { InputBridge } from '../bridge/input.bridge';
import { initSyncClient } from '../bridge/sync.client';
import { TauriBridge } from '../bridge/bridge.tauri';
import { EngineMemory, ENGINE_CONFIG } from '../config/memory.config';

export function useEngineKernel() {
    const registerEntity = useSystemicStore(state => state.registerEntity);
    const [kernelWorker, setKernelWorker] = useState(null);
    const [isBuildRuntime, setIsBuildRuntime] = useState(false);
    const bootSequenceRun = useRef(false);

    useEffect(() => {
        if (bootSequenceRun.current) return;
        bootSequenceRun.current = true;

        // 1. Inicializar el puente de teclado/ratón hacia la memoria de 256 bytes
        InputBridge.initialize(EngineMemory.inputBuffer);

        // 2. Pre-formatear el buffer físico para evitar NaNs en cuaterniones y escalas
        const view = new Float32Array(EngineMemory.physicsBuffer);
        for (let i = 0; i < ENGINE_CONFIG.MAX_ENTITIES; i++) {
            const offset = i * ENGINE_CONFIG.STRIDE_FLOATS;
            view[offset + 6] = 1; // rotW base
            view[offset + 7] = 1; // scaleX base
            view[offset + 8] = 1; // scaleY base
            view[offset + 9] = 1; // scaleZ base
        }

        // 3. Encender el Motor Físico (Web Worker) e inyectar memoria
        const worker = new Worker(new URL('../logic.worker.js', import.meta.url), { type: 'module' });
        worker.postMessage({
            type: 'INIT_MEM',
            payload: { physics: EngineMemory.physicsBuffer, input: EngineMemory.inputBuffer }
        });

        // 4. Secuencia de Hidratación Asíncrona (Escena guardada o Sandbox por defecto)
        const bootstrapScene = async () => {
            try {
                const autoScene = await TauriBridge.loadScene();
                if (autoScene && typeof autoScene === 'object') {
                    if (window.__TAURI_INTERNALS__ !== undefined && !autoScene.editorVisible) {
                        setIsBuildRuntime(true); // Activa el layout de juego final compilado
                    }

                    Object.keys(autoScene.entities ?? {}).forEach(id => {
                        registerEntity(id, autoScene.entities[id]);
                        worker.postMessage({
                            type: 'ADD_ENTITY_LOGIC',
                            payload: { id, ...autoScene.entities[id] }
                        });
                    });
                } else {
                    // Carga del entorno de desarrollo limpio
                    const floorData = {
                        index: ENGINE_CONFIG.MAX_ENTITIES - 1, name: 'Suelo Base', type: 'box',
                        scale: [40, 0.5, 40], color: '#16161a', position: [0, -0.25, 0]
                    };
                    registerEntity('static_floor_0', floorData);
                    worker.postMessage({ type: 'ADD_ENTITY_LOGIC', payload: { id: 'static_floor_0', ...floorData, x: 0, y: -0.25, z: 0, scaleX: 40, scaleY: 0.5, scaleZ: 40 } });
                }
            } catch (e) {
                console.warn("[Kernel Boot] Fallo en la lectura del disco. Inicializando Sandbox Vacía.");
            }
        };

        bootstrapScene();
        setKernelWorker(worker);
        initSyncClient(worker);

        return () => {
            worker.terminate();
            bootSequenceRun.current = false;
        };
    }, [registerEntity]);

    return { kernelWorker, isBuildRuntime };
}