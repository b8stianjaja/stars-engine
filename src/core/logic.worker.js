/**
 * STARS ENGINE V1.0 - Logic Kernel (Web Worker)
 * Ejecución aislada a 60Hz con despacho de comandos atómicos y corrección de deriva.
 */

let sharedBuffer = null;
let floatView = null;
let entities = [];

const DISPATCHER = {
    INIT_MEM: (payload) => {
        sharedBuffer = payload;
        floatView = new Float32Array(sharedBuffer);
        floatView.fill(0);
        runSimulation();
    },

    ADD_ENTITY_LOGIC: (payload) => {
        // Evitar duplicaciones redundantes de ID lógico
        if (entities.some(e => e.id === payload.id)) return;

        entities.push({
            id: payload.id,
            index: payload.index,
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            z: payload.z ?? 0,
            behavior: null
        });
    },

    REMOVE_ENTITY_LOGIC: (payload) => {
        const targetIndex = entities.findIndex(e => e.id === payload.id);
        if (targetIndex !== -1) {
            const ent = entities[targetIndex];

            // Mitigación total de Ghosting: colapsar la región de memoria de la entidad al abismo espacial
            if (floatView) {
                const offset = ent.index * 3;
                floatView[offset] = 0;
                floatView[offset + 1] = -9999.0; // Desplazamiento fuera de la frustum de renderizado
                floatView[offset + 2] = 0;
            }

            entities.splice(targetIndex, 1);
        }
    },

    UPDATE_PHYSICAL_POS: (payload) => {
        const target = entities.find(e => e.id === payload.id);
        if (target) {
            target.x = payload.x;
            target.y = payload.y;
            target.z = payload.z;
        }
    },

    INJECT_SCRIPT: (payload) => {
        try {
            const behaviorFunc = new Function('ent', payload.code);
            const target = entities.find(e => e.id === payload.id);
            if (target) target.behavior = behaviorFunc;
        } catch (err) {
            console.error(`[Stars Kernel Compiler Error - ${payload.id}]:`, err.message);
        }
    }
};

self.onmessage = (e) => {
    const { type, payload } = e.data;
    if (DISPATCHER[type]) DISPATCHER[type](payload);
};

function runSimulation() {
    const TARGET_FPS = 60;
    const TICK_INTERVAL = 1000 / TARGET_FPS; // ~16.666ms

    let expectedTickTime = performance.now();
    let lastTelemetryTime = performance.now();

    function executionStep() {
        const startTick = performance.now();

        // 1. Ejecutar comportamientos dinámicos inyectados
        for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            if (ent.behavior) {
                try { ent.behavior(ent); } catch (e) { ent.behavior = null; }
            }
        }

        // 2. Volcado directo O(1) a la vista binaria compartida
        if (floatView) {
            for (let i = 0; i < entities.length; i++) {
                const ent = entities[i];
                const offset = ent.index * 3;
                floatView[offset] = ent.x;
                floatView[offset + 1] = ent.y;
                floatView[offset + 2] = ent.z;
            }
        }

        const endTick = performance.now();

        // --- CÁLCULO NATIVO DE AJUSTE Y DERIVA (DRIFT CORRECTION) ---
        expectedTickTime += TICK_INTERVAL;
        const drift = startTick - (expectedTickTime - TICK_INTERVAL);
        const nextTimeoutDelay = Math.max(0, TICK_INTERVAL - (endTick - startTick) - drift);

        // Despacho periódico de telemetría sin saturar el canal de comunicación
        const deltaTelemetry = startTick - lastTelemetryTime;
        lastTelemetryTime = startTick;

        self.postMessage({
            type: 'TELEMETRY_DATA',
            payload: {
                fps: 1000 / (deltaTelemetry || TICK_INTERVAL),
                delta: deltaTelemetry,
                workerLoad: endTick - startTick
            }
        });

        // Re-encolar de forma adaptativa el siguiente frame físico
        setTimeout(executionStep, nextTimeoutDelay);
    }

    setTimeout(executionStep, TICK_INTERVAL);
}