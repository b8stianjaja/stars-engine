let sharedArray = null;
const entities = new Map();

// Bucle Físico a 60Hz fijos (Determinista)
const TICK_RATE = 1000 / 60;
let lastTime = performance.now();

function physicsLoop() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (sharedArray) {
        for (const [id, data] of entities) {
            const offset = data.index * 16;

            // Si el desarrollador inyectó código en LiveEditor.jsx, se evalúa aquí
            if (data.updateLogic) {
                try {
                    // Se ejecuta el script pasando el objeto "entity" y el "deltaTime"
                    data.updateLogic(data, dt);

                    // Sincronizar de vuelta a la memoria física (Array de alto rendimiento)
                    sharedArray[offset + 0] = data.x;
                    sharedArray[offset + 1] = data.y;
                    sharedArray[offset + 2] = data.z;
                    sharedArray[offset + 6] = data.scaleX;
                    sharedArray[offset + 7] = data.scaleY;
                    sharedArray[offset + 8] = data.scaleZ;
                } catch (e) {
                    // Si el código falla, abortamos para no bloquear el hilo y avisamos a React
                    self.postMessage({ type: 'SCRIPT_STATUS', payload: { id, status: 'RUNTIME_ERROR', error: e.message } });
                    data.updateLogic = null;
                }
            }
        }
    }

    setTimeout(physicsLoop, TICK_RATE);
}

// Iniciar latido del motor
physicsLoop();

// Enrutador de mensajes entrantes desde App.jsx / LiveEditor.jsx
self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT_MEM':
            // Recibimos la memoria compartida por primera vez
            sharedArray = new Float32Array(payload);
            break;

        case 'ADD_ENTITY_LOGIC':
            if (sharedArray) {
                const offset = payload.index * 16;
                sharedArray[offset + 0] = payload.x;
                sharedArray[offset + 1] = payload.y;
                sharedArray[offset + 2] = payload.z;
                sharedArray[offset + 6] = payload.scaleX || 1;
                sharedArray[offset + 7] = payload.scaleY || 1;
                sharedArray[offset + 8] = payload.scaleZ || 1;
            }
            entities.set(payload.id, { ...payload, updateLogic: null });
            break;

        case 'UPDATE_PHYSICAL_POS':
            // Actualización forzada (ej: Arrastre manual por un artista con Gizmo)
            if (entities.has(payload.id)) {
                const ent = entities.get(payload.id);
                if (payload.x !== undefined) ent.x = payload.x;
                if (payload.y !== undefined) ent.y = payload.y;
                if (payload.z !== undefined) ent.z = payload.z;
                if (payload.scaleX !== undefined) ent.scaleX = payload.scaleX;
                if (payload.scaleY !== undefined) ent.scaleY = payload.scaleY;
                if (payload.scaleZ !== undefined) ent.scaleZ = payload.scaleZ;

                if (sharedArray) {
                    const offset = ent.index * 16;
                    if (payload.x !== undefined) sharedArray[offset + 0] = payload.x;
                    if (payload.y !== undefined) sharedArray[offset + 1] = payload.y;
                    if (payload.z !== undefined) sharedArray[offset + 2] = payload.z;
                    if (payload.scaleX !== undefined) sharedArray[offset + 6] = payload.scaleX;
                    if (payload.scaleY !== undefined) sharedArray[offset + 7] = payload.scaleY;
                    if (payload.scaleZ !== undefined) sharedArray[offset + 8] = payload.scaleZ;
                }
            }
            break;

        case 'INJECT_SCRIPT':
            if (entities.has(payload.id)) {
                const ent = entities.get(payload.id);
                try {
                    // Sandbox: Transforma un string de código puro en una función viva
                    // Ejemplo de lo que escribe el user: "entity.y += Math.sin(Date.now() / 100) * deltaTime;"
                    const logicFn = new Function('entity', 'deltaTime', payload.code);
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