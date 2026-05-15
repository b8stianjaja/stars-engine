/**
 * STARS ENGINE V1.0 - Logic Kernel (Web Worker)
 * Ejecución aislada a 60Hz con despacho de comandos atómicos.
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
        entities.push({
            id: payload.id,
            index: payload.index,
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            z: payload.z ?? 0,
            behavior: null
        });
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
    let lastTime = performance.now();

    setInterval(() => {
        const startTick = performance.now();

        // 1. Ejecutar comportamientos de las entidades dinámicas
        for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            if (ent.behavior) {
                try { ent.behavior(ent); } catch (e) { ent.behavior = null; }
            }
        }

        // 2. Volcado directo a memoria compartida sin postMessage overhead
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
        const delta = startTick - lastTime;
        lastTime = startTick;

        self.postMessage({
            type: 'TELEMETRY_DATA',
            payload: { fps: 1000 / (delta || 16.6), delta, workerLoad: endTick - startTick }
        });
    }, 1000 / 60);
}