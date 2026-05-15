// src/starsengine/core/logic/CoreRunner.js
import { useEngineStore } from '../stores/engineStore';
import { SystemRegistry } from './SystemRegistry';

class CoreRunner {
    constructor() {
        this.lastTime = performance.now();
        this.frameId = null;
        this.isRunning = false;

        // Vinculación explícita para evitar errores de contexto
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now(); // Reset del tiempo al iniciar
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.frameId) cancelAnimationFrame(this.frameId);
    }

    loop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Acceso al estado de Zustand
        const state = useEngineStore.getState();
        const { playState, entities, activeSceneId, scenes } = state;

        if (playState === 'PLAYING') {
            const currentScene = scenes[activeSceneId];
            if (currentScene && currentScene.entityIds) {
                currentScene.entityIds.forEach(id => {
                    const entity = entities[id];
                    if (entity) {
                        SystemRegistry.updateEntity(entity, deltaTime);
                    }
                });
            }
        }

        this.frameId = requestAnimationFrame(this.loop);
    }
}

// Exportamos una única instancia constante
export const engineRunner = new CoreRunner();