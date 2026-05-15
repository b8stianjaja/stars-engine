// src/starsengine/core/logic/SystemRegistry.js
import { inputs } from './InputManager';
import { useEngineStore } from '../stores/engineStore';

export const SystemRegistry = {
    scriptInstances: new Map(),

    updateEntity(entity, dt) {
        // 1. Metabolismo (Hambre/Salud)
        if (entity.components.Stats) this.processMetabolism(entity, dt);

        // 2. Animación (Hand-drawn sequences)
        if (entity.components.Animation) AnimationSystem.update(entity, dt);

        // 3. Lógica de Script (Input/Acción)
        if (entity.components.Script?.enabled) this.executeScript(entity, dt);
    },

    processMetabolism(entity, dt) {
        const stats = entity.components.Stats;
        if (stats.hunger > 0) {
            // Reducción constante de hambre (Estilo Don't Starve)
            const newHunger = Math.max(0, stats.hunger - (0.2 * dt));
            useEngineStore.getState().updateComponent(entity.id, 'Stats', { hunger: newHunger });
        }
    },

    executeScript(entity, dt) {
        try {
            let scriptFn = this.scriptInstances.get(entity.id);
            if (!scriptFn && entity.components.Script.source) {
                scriptFn = new Function('entity', 'dt', 'api', entity.components.Script.source);
                this.scriptInstances.set(entity.id, scriptFn);
            }

            if (scriptFn) {
                const api = {
                    input: inputs,
                    move: (vec) => {
                        const currentPos = entity.components.Transform.pos;
                        useEngineStore.getState().updateComponent(entity.id, 'Transform', {
                            pos: [currentPos[0] + vec[0], currentPos[1] + vec[1], currentPos[2] + vec[2]]
                        });
                    },
                    getStats: () => entity.components.Stats,
                    setStats: (data) => useEngineStore.getState().updateComponent(entity.id, 'Stats', data)
                };
                scriptFn(entity, dt, api);
            }
        } catch (err) {
            console.error("Script Runtime Error:", err);
        }
    }
};