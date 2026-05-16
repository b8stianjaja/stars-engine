export class InputBridge {
    static view = null;

    // Diccionario estricto de Hardware a Memoria Física (Índices)
    static KEY_MAP = {
        'KeyW': 1, 'KeyA': 2, 'KeyS': 3, 'KeyD': 4,
        'ArrowUp': 5, 'ArrowDown': 6, 'ArrowLeft': 7, 'ArrowRight': 8,
        'Space': 9, 'Enter': 10, 'Escape': 11,
        'ClickLeft': 20, 'ClickRight': 21
    };

    static initialize(sharedInputBuffer) {
        if (this.view) return; // Patrón Singleton estricto
        this.view = new Int32Array(sharedInputBuffer);

        window.addEventListener('keydown', (e) => {
            const index = this.KEY_MAP[e.code];
            if (index !== undefined) this.view[index] = 1;
        }, { passive: true });

        window.addEventListener('keyup', (e) => {
            const index = this.KEY_MAP[e.code];
            if (index !== undefined) this.view[index] = 0;
        }, { passive: true });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.view[this.KEY_MAP['ClickLeft']] = 1;
            if (e.button === 2) this.view[this.KEY_MAP['ClickRight']] = 1;
        }, { passive: true });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.view[this.KEY_MAP['ClickLeft']] = 0;
            if (e.button === 2) this.view[this.KEY_MAP['ClickRight']] = 0;
        }, { passive: true });
    }
}