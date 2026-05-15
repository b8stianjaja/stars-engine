// src/starsengine/core/logic/AnimationSystem.js
import { useEngineStore } from '../stores/engineStore';

export const AnimationSystem = {
    update(entity, dt) {
        const anim = entity.components.Animation;
        if (!anim || !anim.isPlaying) return;

        let { currentFrame, elapsedTime, frameRate, loop } = anim;

        // Acumular tiempo transcurrido
        elapsedTime += dt;
        const frameDuration = 1 / frameRate;

        if (elapsedTime >= frameDuration) {
            // Avanzar fotograma
            const nextFrame = currentFrame + 1;

            // Aquí se validaría contra el total de frames del atlas (ej. 12 frames)
            const totalFrames = 12;

            if (nextFrame >= totalFrames) {
                if (loop) {
                    currentFrame = 0;
                } else {
                    currentFrame = totalFrames - 1;
                    // anim.isPlaying = false;
                }
            } else {
                currentFrame = nextFrame;
            }

            elapsedTime = 0;

            // Actualización atómica en el store
            useEngineStore.getState().updateComponent(entity.id, 'Animation', {
                currentFrame,
                elapsedTime
            });
        }
    }
};