// src/core/logic.worker.js
let physicsArray = null;
let inputArray = null;
const entities = new Map();

const eventQueue = {
    clicks: []
};

const PhysicsCore = {
    getAABB: (ent) => {
        const halfX = (ent.scaleX ?? 1) / 2;
        const halfY = (ent.scaleY ?? 1) / 2;
        const halfZ = (ent.scaleZ ?? 1) / 2;
        return {
            minX: ent.x - halfX, maxX: ent.x + halfX,
            minY: ent.y - halfY, maxY: ent.y + halfY,
            minZ: ent.z - halfZ, maxZ: ent.z + halfZ
        };
    },

    testOverlap: (a, b) => {
        return (a.minX <= b.maxX && a.maxX >= b.minX) &&
            (a.minY <= b.maxY && a.maxY >= b.minY) &&
            (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
    },

    moveAndSlide: (entity, dx, dy, dz) => {
        entity.x += dx;
        let box = PhysicsCore.getAABB(entity);
        for (const [id, obstacle] of entities) {
            if (id === entity.id || obstacle.isGhostMask || obstacle.properties?.isTrigger) continue;
            if (PhysicsCore.testOverlap(box, PhysicsCore.getAABB(obstacle))) {
                entity.x -= dx;
                if (entity.vx !== undefined) entity.vx = 0;
                break;
            }
        }

        entity.y += dy;
        box = PhysicsCore.getAABB(entity);
        for (const [id, obstacle] of entities) {
            if (id === entity.id || obstacle.isGhostMask || obstacle.properties?.isTrigger) continue;
            if (PhysicsCore.testOverlap(box, PhysicsCore.getAABB(obstacle))) {
                entity.y -= dy;
                if (entity.vy !== undefined && entity.vy < 0) {
                    entity.isGrounded = true;
                }
                if (entity.vy !== undefined) entity.vy = 0;
                break;
            }
        }

        entity.z += dz;
        box = PhysicsCore.getAABB(entity);
        for (const [id, obstacle] of entities) {
            if (id === entity.id || obstacle.isGhostMask || obstacle.properties?.isTrigger) continue;
            if (PhysicsCore.testOverlap(box, PhysicsCore.getAABB(obstacle))) {
                entity.z -= dz;
                if (entity.vz !== undefined) entity.vz = 0;
                break;
            }
        }
    }
};

const Engine = {
    Input: {
        getKey: (keyCode) => {
            if (!inputArray) return false;
            const map = {
                'KeyW': 1, 'KeyA': 2, 'KeyS': 3, 'KeyD': 4,
                'ArrowUp': 5, 'ArrowDown': 6, 'ArrowLeft': 7, 'ArrowRight': 8,
                'Space': 9, 'Enter': 10, 'Escape': 11,
                'ClickLeft': 20, 'ClickRight': 21
            };
            const index = map[keyCode];
            return index !== undefined ? inputArray[index] === 1 : false;
        },
        consumeClick: () => eventQueue.clicks.pop() || null
    },
    Math: {
        lerp: (start, end, amt) => (1 - amt) * start + amt * end,
        distance: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2),
        clamp: (val, min, max) => Math.max(min, Math.min(max, val))
    },
    Physics: {
        moveAndSlide: (entityInstance, moveX, moveY, moveZ) => {
            PhysicsCore.moveAndSlide(entityInstance, moveX, moveY, moveZ);
        },
        applyGravity: (entityInstance, deltaTime, gravityConstant = 9.8) => {
            if (entityInstance.vy === undefined) entityInstance.vy = 0;
            entityInstance.isGrounded = false;
            entityInstance.vy -= gravityConstant * deltaTime;
            PhysicsCore.moveAndSlide(entityInstance, 0, entityInstance.vy * deltaTime, 0);
        },
        getEntitiesNearby: (entityInstance, radius) => {
            const list = [];
            const r = radius ?? 5;
            for (const [id, target] of entities) {
                if (id === entityInstance.id) continue;
                const dist = Math.sqrt((entityInstance.x - target.x) ** 2 + (entityInstance.y - target.y) ** 2 + (entityInstance.z - target.z) ** 2);
                if (dist <= r) {
                    list.push({ id, name: target.name, type: target.type, x: target.x, y: target.y, z: target.z });
                }
            }
            return list;
        }
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
                        data.updateLogic(data, FIXED_DT, Engine);

                        const offset = data.index * 16;
                        physicsArray[offset + 0] = data.x;
                        physicsArray[offset + 1] = data.y;
                        physicsArray[offset + 2] = data.z;

                        physicsArray[offset + 3] = data.rotX ?? 0;
                        physicsArray[offset + 4] = data.rotY ?? 0;
                        physicsArray[offset + 5] = data.rotZ ?? 0;
                        physicsArray[offset + 6] = data.rotW ?? 1;

                        physicsArray[offset + 7] = data.scaleX ?? 1;
                        physicsArray[offset + 8] = data.scaleY ?? 1;
                        physicsArray[offset + 9] = data.scaleZ ?? 1;

                        physicsArray[offset + 10] = data.vy ?? 0;
                        physicsArray[offset + 11] = data.isGrounded ? 1.0 : 0.0;
                    } catch (e) {
                        self.postMessage({ type: 'SCRIPT_STATUS', payload: { id, status: 'RUNTIME_ERROR', error: e.message } });
                        data.updateLogic = null;
                    }
                }
            }
        }
        accumulator -= TICK_RATE;
        eventQueue.clicks = [];
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

        case 'CLEAR_PHYSICS_WORLD':
            entities.clear();
            if (physicsArray) {
                physicsArray.fill(0);
            }
            break;

        case 'ADD_ENTITY_LOGIC': {
            // Re-hidratar posiciones cinemáticas directas al Stride lineal del buffer compartido
            const startX = payload.x ?? payload.position?.[0] ?? 0;
            const startY = payload.y ?? payload.position?.[1] ?? 0;
            const startZ = payload.z ?? payload.position?.[2] ?? 0;

            const rotX = payload.rotX ?? payload.quaternion?.[0] ?? 0;
            const rotY = payload.rotY ?? payload.quaternion?.[1] ?? 0;
            const rotZ = payload.rotZ ?? payload.quaternion?.[2] ?? 0;
            const rotW = payload.rotW ?? payload.quaternion?.[3] ?? 1;

            const scaleX = payload.scaleX || (payload.scale?.[0]) || 1;
            const scaleY = payload.scaleY || (payload.scale?.[1]) || 1;
            const scaleZ = payload.scaleZ || (payload.scale?.[2]) || 1;

            if (physicsArray) {
                const offset = payload.index * 16;
                physicsArray[offset + 0] = startX;
                physicsArray[offset + 1] = startY;
                physicsArray[offset + 2] = startZ;
                physicsArray[offset + 3] = rotX;
                physicsArray[offset + 4] = rotY;
                physicsArray[offset + 5] = rotZ;
                physicsArray[offset + 6] = rotW;
                physicsArray[offset + 7] = scaleX;
                physicsArray[offset + 8] = scaleY;
                physicsArray[offset + 9] = scaleZ;
                physicsArray[offset + 10] = payload.properties?.lastVelocityY ?? 0;
                physicsArray[offset + 11] = payload.properties?.isGrounded ? 1.0 : 0.0;
            }

            // RE-COMPILACIÓN AUTOMÁTICA EN TRÁNSITO DE ESCENAS (MANDATO HOT-LOGIC)
            let compiledLogicFn = null;
            if (payload.scriptCode) {
                try {
                    compiledLogicFn = new Function('entity', 'deltaTime', 'Engine', payload.scriptCode);
                } catch (err) {
                    self.postMessage({ type: 'SCRIPT_STATUS', payload: { id: payload.id, status: 'COMPILE_ERROR', error: err.message } });
                }
            }

            entities.set(payload.id, {
                id: payload.id,
                index: payload.index,
                name: payload.name ?? 'Unmanaged Actor',
                type: payload.type ?? 'box',
                updateLogic: compiledLogicFn,
                properties: payload.properties ?? {},
                x: startX, y: startY, z: startZ,
                vx: 0, vy: payload.properties?.lastVelocityY ?? 0, vz: 0,
                isGrounded: payload.properties?.isGrounded ?? false,
                rotX, rotY, rotZ, rotW,
                scaleX, scaleY, scaleZ
            });
            break;
        }

        case 'UPDATE_PHYSICAL_POS':
            if (entities.has(payload.id)) {
                const ent = entities.get(payload.id);
                if (payload.x !== undefined) ent.x = payload.x;
                if (payload.y !== undefined) ent.y = payload.y;
                if (payload.z !== undefined) ent.z = payload.z;
                if (payload.type !== undefined) ent.type = payload.type;
                if (payload.scaleX !== undefined) ent.scaleX = payload.scaleX;
                if (payload.scaleY !== undefined) ent.scaleY = payload.scaleY;
                if (payload.scaleZ !== undefined) ent.scaleZ = payload.scaleZ;

                if (physicsArray) {
                    const offset = ent.index * 16;
                    if (payload.x !== undefined) physicsArray[offset + 0] = payload.x;
                    if (payload.y !== undefined) physicsArray[offset + 1] = payload.y;
                    if (payload.z !== undefined) physicsArray[offset + 2] = payload.z;
                    if (payload.scaleX !== undefined) physicsArray[offset + 7] = payload.scaleX;
                    if (payload.scaleY !== undefined) physicsArray[offset + 8] = payload.scaleY;
                    if (payload.scaleZ !== undefined) physicsArray[offset + 9] = payload.scaleZ;
                }
            }
            break;

        case 'UPDATE_ENTITY_PROPERTIES':
            if (entities.has(payload.id)) {
                const ent = entities.get(payload.id);
                ent.properties = { ...ent.properties, ...payload.properties };
            }
            break;

        case 'INJECT_SCRIPT':
            if (entities.has(payload.id)) {
                const ent = entities.get(payload.id);
                try {
                    const logicFn = new Function('entity', 'deltaTime', 'Engine', payload.code);
                    ent.updateLogic = logicFn;
                    self.postMessage({ type: 'SCRIPT_STATUS', payload: { id: payload.id, status: 'RUNNING', error: null } });
                } catch (e) {
                    self.postMessage({ type: 'SCRIPT_STATUS', payload: { id: payload.id, status: 'COMPILE_ERROR', error: e.message } });
                    ent.updateLogic = null;
                }
            }
            break;
    }
};