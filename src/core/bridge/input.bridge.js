// src/core/bridge/input.bridge.js

export class InputBridge {
    static inputView = null;
    static isInitialized = false;

    // MAPA DE REGISTROS (Alineado estrictamente con el diccionario de logic.worker.js)
    static KEY_MAP = {
        'KeyW': 1, 'KeyA': 2, 'KeyS': 3, 'KeyD': 4,
        'ArrowUp': 5, 'ArrowDown': 6, 'ArrowLeft': 7, 'ArrowRight': 8,
        'Space': 9, 'Enter': 10, 'Escape': 11
    };

    static BUTTON_MAP = {
        0: 20, // Click Izquierdo Principal
        2: 21  // Click Derecho Secundario
    };

    /**
     * Inicializa la vista de memoria y vincula los transductores de eventos de bajo nivel.
     * @param {SharedArrayBuffer} sharedBuffer - Bloque de memoria reservado de 256 bytes.
     */
    static initialize(sharedBuffer) {
        if (this.isInitialized) return;

        // Vista atómica de enteros de 32 bits para operaciones binarias inmediatas
        this.inputView = new Int32Array(sharedBuffer);

        // Purgar memoria residual: Rellenar el buffer de periféricos con ceros magnéticos
        for (let i = 0; i < this.inputView.length; i++) {
            this.inputView[i] = 0;
        }

        this.attachListeners();
        this.isInitialized = true;
        console.log("[InputBridge] Hardware Abstraction Layer vinculada exitosamente a Int32Array.");
    }

    /**
     * Aislamiento Defensivo de Interfaz (Context Preservation)
     * Evita que el motor físico intercepte las teclas cuando el operador está escribiendo código en Monaco o inputs de UI.
     * @returns {boolean}
     */
    static isTyping() {
        if (!document.activeElement) return false;
        const activeTag = document.activeElement.tagName.toLowerCase();
        // Monaco Editor utiliza un elemento <textarea> oculto para la captura nativa
        return activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
    }

    static attachListeners() {
        // EVENTO: PRESIÓN DE TECLA (DOWN)
        window.addEventListener('keydown', (e) => {
            if (this.isTyping()) return; // Abortar puente si la UI tiene foco de escritura

            const index = this.KEY_MAP[e.code];
            if (index !== undefined) {
                this.inputView[index] = 1;

                // Evitar comportamientos del navegador (Scroll de página) al usar espacio o flechas direccionales
                if (index >= 5 && index <= 9) {
                    e.preventDefault();
                }
            }
        }, { passive: false });

        // EVENTO: LIBERACIÓN DE TECLA (UP)
        window.addEventListener('keyup', (e) => {
            const index = this.KEY_MAP[e.code];
            if (index !== undefined) {
                this.inputView[index] = 0;
            }
        });

        // EVENTO: PRESIÓN DE RATÓN (DOWN)
        window.addEventListener('mousedown', (e) => {
            const index = this.BUTTON_MAP[e.button];
            if (index !== undefined) {
                this.inputView[index] = 1;
            }
        });

        // EVENTO: LIBERACIÓN DE RATÓN (UP)
        window.addEventListener('mouseup', (e) => {
            const index = this.BUTTON_MAP[e.button];
            if (index !== undefined) {
                this.inputView[index] = 0;
            }
        });

        // SISTEMA ANTI-GHOSTING: Reseteo defensivo al perder el foco
        // Evita que el motor deje una tecla "atascada" (en 1) si el usuario cambia de ventana (Alt+Tab) mientras la presiona.
        window.addEventListener('blur', () => {
            if (!this.inputView) return;
            for (let i = 0; i < this.inputView.length; i++) {
                this.inputView[i] = 0;
            }
        });
    }
}