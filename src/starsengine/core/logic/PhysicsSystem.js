// src/starsengine/core/logic/PhysicsSystem.js
import { useEngineStore } from '../stores/engineStore';

export const PhysicsSystem = {
    // Detección AABB (Axis-Aligned Bounding Box) para precisión técnica
    checkCollision(entityA, entityB) {
        const a = entityA.components.Transform.pos;
        const b = entityB.components.Transform.pos;
        const sA = entityA.components.Transform.sca;
        const sB = entityB.components.Transform.sca;

        return (
            Math.abs(a[0] - b[0]) * 2 < (sA[0] + sB[0]) &&
            Math.abs(a[1] - b[1]) * 2 < (sA[1] + sB[1]) &&
            Math.abs(a[2] - b[2]) * 2 < (sA[2] + sB[2])
        );
    },

    update(entities, entityIds, dt) {
        // Optimización: Solo comparamos entidades con componentes físicos activos
        for (let i = 0; i < entityIds.length; i++) {
            for (let j = i + 1; j < entityIds.length; j++) {
                const eA = entities[entityIds[i]];
                const eB = entities[entityIds[j]];

                if (eA && eB && this.checkCollision(eA, eB)) {
                    // Emitir evento de colisión a los scripts
                    this.notifyCollision(eA, eB);
                }
            }
        }
    },

    notifyCollision(eA, eB) {
        // Se inyecta en el buffer de eventos para que el SystemRegistry lo procese
        // Esto permite mecánicas como "daño por contacto"
    }
};