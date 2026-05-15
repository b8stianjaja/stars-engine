// src/starsengine/core/logic/InputManager.js
class InputManager {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }
}

export const inputs = new InputManager();