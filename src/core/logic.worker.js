let physicsArray = null;
let inputArray = null;
const entities = new Map();

// Cola de eventos asíncronos (Para Point & Click)
const eventQueue = {
    clicks: []
};

// API PÚBLICA DEL MOTOR (Expuesta al Desarrollador en LiveEditor)
const Engine = {
    Input: {
        getKey: (keyCode) => {
            if (!inputArray) return false;
            const map = { 'KeyW': 1, 'KeyA': 2, 'KeyS': 3, 'KeyD': 4, 'Space': 9, 'ClickLeft': 20 };
            const index = map[keyCode];
            return index !== undefined ? inputArray[index] === 1 : false;
        },
        // Consume el último clic espacial realizado en el entorno 3D
        consumeClick: () => eventQueue.clicks.pop() || null
    },
    Math: {
        lerp: (start, end, amt) => (1 - amt) * start + amt * end,
        distance: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
    }
};

const TICK_RATE = 1000 / 60;
const FIXED_DT = TICK_RATE / 1000;
let lastTime = performance.now();
let accumulator = 0;

function physicsLoop() {
    const now = performance.now();
    accumulator += (now - lastTime);
    lastTime = now;

    while (accumulator >= TICK_RATE) {
        if (physicsArray) {
            for (const [id, data] of entities) {
                if (data.updateLogic) {
                    try {
                        // Inyección de la API 'Engine' al script del usuario
                        data.updateLogic(data, FIXED_DT, Engine);

                        const offset = data.index * 16;
                        physicsArray[offset + 0] = data.x;
                        physicsArray[offset + 1] = data.y;
                        physicsArray[offset + 2] = data.z;

                        physicsArray[offset + 3] = data.rotX ?? 0;
                        physicsArray[offset + 4] = data.rotY ?? 0;
                        physicsArray[offset + 5] = data.rotZ ?? 0;
                        physicsArray[offset + 6] = data.rotW ?? 1;

                        physicsArray[offset + 7] = data.scaleX;
                        physicsArray[offset + 8] = data.scaleY;
                        physicsArray[offset + 9] = data.scaleZ;
                    } catch (e) {
                        self.postMessage({ type: 'SCRIPT_STATUS', payload: { id, status: 'RUNTIME_ERROR', error: e.message } });
                        data.updateLogic = null;
                    }
                }
            }
        }
        accumulator -= TICK_RATE;
        eventQueue.clicks = []; // Limpieza determinista al final del frame
    }

    setTimeout(physicsLoop, Math.max(0, TICK_RATE - accumulator));
}

physicsLoop();

self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT_MEM':
            physicsArray = new Float32Array(payload.physics);
            inputArray = new Int32Array(payload.input);
            break;

        case 'SPATIAL_CLICK':
            eventQueue.clicks.push({ entityId: payload.id, point: payload.point });
            break;

        case 'ADD_ENTITY_LOGIC':
            if (physicsArray) {
                const offset = payload.index * 16;
                physicsArray[offset + 0] = payload.x;
                physicsArray[offset + 1] = payload.y;
                physicsArray[offset + 2] = payload.z;
                physicsArray[offset + 3] = payload.rotX ?? 0;
                physicsArray[offset + 4] = payload.rotY ?? 0;
                physicsArray[offset + 5] = payload.rotZ ?? 0;
                physicsArray[offset + 6] = payload.rotW ?? 1;
                physicsArray[offset + 7] = payload.scaleX || 1;
                physicsArray[offset + 8] = payload.scaleY || 1;
                physicsArray[offset + 9] = payload.scaleZ || 1;
            }
            entities.set(payload.id, { ...payload, updateLogic: null, rotX: 0, rotY: 0, rotZ: 0, rotW: 1 });
            break;

        case 'UPDATE_PHYSICAL_POS':
            if (entities.has(payload.id)) {
                const ent = entities.get(payload.id);
                if (payload.x !== undefined) ent.x = payload.x;
                if (payload.y !== undefined) ent.y = payload.y;
                if (payload.z !== undefined) ent.z = payload.z;
                if (payload.rotX !== undefined) ent.rotX = payload.rotX;
                if (payload.rotY !== undefined) ent.rotY = payload.rotY;
                if (payload.rotZ !== undefined) ent.rotZ = payload.rotZ;
                if (payload.rotW !== undefined) ent.rotW = payload.rotW;
                if (payload.scaleX !== undefined) ent.scaleX = payload.scaleX;
                if (payload.scaleY !== undefined) ent.scaleY = payload.scaleY;
                if (payload.scaleZ !== undefined) ent.scaleZ = payload.scaleZ;

                if (physicsArray) {
                    const offset = ent.index * 16;
                    if (payload.x !== undefined) physicsArray[offset + 0] = payload.x;
                    if (payload.y !== undefined) physicsArray[offset + 1] = payload.y;
                    if (payload.z !== undefined) physicsArray[offset + 2] = payload.z;
                    if (payload.rotX !== undefined) physicsArray[offset + 3] = payload.rotX;
                    if (payload.rotY !== undefined) physicsArray[offset + 4] = payload.rotY;
                    if (payload.rotZ !== undefined) physicsArray[offset + 5] = payload.rotZ;
                    if (payload.rotW !== undefined) physicsArray[offset + 6] = payload.rotW;
                    if (payload.scaleX !== undefined) physicsArray[offset + 7] = payload.scaleX;
                    if (payload.scaleY !== undefined) physicsArray[offset + 8] = payload.scaleY;
                    if (payload.scaleZ !== undefined) physicsArray[offset + 9] = payload.scaleZ;
                }
            }
            break;

        case 'INJECT_SCRIPT':
            if (entities.has(payload.id)) {
                const ent = entities.get(payload.id);
                try {
                    // Sandbox blindado con 'Engine'
                    const logicFn = new Function('entity', 'deltaTime', 'Engine', payload.code);
                    ent.updateLogic = logicFn;
                    self.postMessage({ type: 'SCRIPT_STATUS', payload: { id: payload.id, status: 'RUNNING', error: null } });
                } catch (e) {
                    self.postMessage({ type: 'SCRIPT_STATUS', payload: { id: payload.id, status: 'COMPILE_ERROR', error: e.message } });
                    ent.updateLogic = null;
                }
            }
            break;

        case 'REMOVE_ENTITY_LOGIC':
            entities.delete(payload.id);
            break;
    }
};