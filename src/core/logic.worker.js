/**
 * STARS ENGINE V1.0 - Logic & Combat Kernel (Web Worker)
 * Simulación y cálculo determinista a 60Hz de mecánicas de combate e inventarios.
 */

let sharedBuffer = null;
let floatView = null;
let entities = [];
let simTime = 0;
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

let artGrids = { foreground: null, background: null };

const DISPATCHER = {
    INIT_MEM: (payload) => {
        sharedBuffer = payload;
        floatView = new Float32Array(sharedBuffer);
        floatView.fill(0);
        runSimulation();
    },

    ADD_ENTITY_LOGIC: (payload) => {
        if (entities.some(e => e.id === payload.id)) return;

        entities.push({
            id: payload.id,
            index: payload.index,
            x: payload.x ?? 0, y: payload.y ?? 0, z: payload.z ?? 0,
            scaleX: payload.scaleX ?? 1, scaleY: payload.scaleY ?? 1, scaleZ: payload.scaleZ ?? 1,
            baseX: payload.x ?? 0, baseY: payload.y ?? 0, baseZ: payload.z ?? 0,
            // ATRIBUTOS DE SISTEMA DE COMBATE INTERNOS
            faction: payload.gameplay?.faction || 'neutral',
            health: payload.gameplay?.health || 100,
            maxHealth: payload.gameplay?.maxHealth || 100,
            attackPower: payload.gameplay?.attackPower || 15,
            inventory: payload.gameplay?.inventory || [],
            lastInCombatTick: 0,
            iframeWindow: 0, // Control de daño por segundo para evitar colapsos síncronos
            collidingWith: [],
            behavior: null
        });
    },

    REMOVE_ENTITY_LOGIC: (payload) => {
        const targetIndex = entities.findIndex(e => e.id === payload.id);
        if (targetIndex !== -1) {
            const ent = entities[targetIndex];
            if (floatView) {
                const offset = ent.index * 3;
                floatView[offset] = 0;
                floatView[offset + 1] = -9999.0;
                floatView[offset + 2] = 0;
            }
            entities.splice(targetIndex, 1);
        }
    },

    UPDATE_PHYSICAL_POS: (payload) => {
        const target = entities.find(e => e.id === payload.id);
        if (target) {
            if (payload.x !== undefined) { target.x = payload.x; target.baseX = payload.x; }
            if (payload.y !== undefined) { target.y = payload.y; target.baseY = payload.y; }
            if (payload.z !== undefined) { target.z = payload.z; target.baseZ = payload.z; }
            if (payload.scaleX !== undefined) target.scaleX = payload.scaleX;
            if (payload.scaleY !== undefined) target.scaleY = payload.scaleY;
            if (payload.scaleZ !== undefined) target.scaleZ = payload.scaleZ;

            // Sincronizar parámetros lúdicos en tiempo real
            if (payload.gameplay) {
                if (payload.gameplay.faction !== undefined) target.faction = payload.gameplay.faction;
                if (payload.gameplay.health !== undefined) target.health = payload.gameplay.health;
                if (payload.gameplay.attackPower !== undefined) target.attackPower = payload.gameplay.attackPower;
                if (payload.gameplay.inventory !== undefined) target.inventory = [...payload.gameplay.inventory];
            }
        }
    },

    INJECT_SCRIPT: (payload) => {
        try {
            const behaviorFunc = new Function('ent', 'api', payload.code);
            const target = entities.find(e => e.id === payload.id);
            if (target) {
                target.behavior = behaviorFunc;
                self.postMessage({ type: 'SCRIPT_STATUS', payload: { id: payload.id, status: 'RUNNING', error: null } });
            }
        } catch (err) {
            self.postMessage({ type: 'SCRIPT_STATUS', payload: { id: payload.id, status: 'COMPILE_ERROR', error: err.message } });
        }
    },

    LOAD_SCENE_LOGIC: (payload) => {
        entities = payload.map(e => ({
            id: e.id, index: e.index,
            x: e.position[0], y: e.position[1], z: e.position[2],
            scaleX: e.scale[0], scaleY: e.scale[1], scaleZ: e.scale[2],
            baseX: e.position[0], baseY: e.position[1], baseZ: e.position[2],
            faction: e.gameplay?.faction || 'neutral',
            health: e.gameplay?.health || 100,
            maxHealth: e.gameplay?.maxHealth || 100,
            attackPower: e.gameplay?.attackPower || 15,
            inventory: e.gameplay?.inventory || [],
            lastInCombatTick: 0, iframeWindow: 0,
            collidingWith: [], behavior: null
        }));

        payload.forEach(e => {
            if (e.scriptCode && e.scriptCode.trim() !== '') {
                try {
                    const behaviorFunc = new Function('ent', 'api', e.scriptCode);
                    const target = entities.find(t => t.id === e.id);
                    if (target) target.behavior = behaviorFunc;
                } catch (err) {
                    console.error(`[Stars Kernel Auto-Compile Error]:`, err.message);
                }
            }
        });
    },

    UPDATE_CANVAS_GRID: (payload) => {
        artGrids[payload.layer] = { resolution: payload.resolution, grid: payload.grid };
    }
};

self.onmessage = (e) => {
    const { type, payload } = e.data;
    if (DISPATCHER[type]) DISPATCHER[type](payload);
};

function runSimulation() {
    let expectedTickTime = performance.now();

    function executionStep() {
        const startTick = performance.now();
        const deltaTime = TICK_INTERVAL / 1000;

        simTime += deltaTime;

        // 1. Snapshot posicional previo
        for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            ent.oldX = ent.x; ent.oldY = ent.y; ent.oldZ = ent.z;
            if (ent.iframeWindow > 0) ent.iframeWindow -= deltaTime;
        }

        // 2. Procesador AABB de Colisión Estricta y Combate Faccional
        for (let i = 0; i < entities.length; i++) entities[i].collidingWith = [];
        for (let i = 0; i < entities.length; i++) {
            const a = entities[i];
            for (let j = i + 1; j < entities.length; j++) {
                const b = entities[j];

                const overlapX = Math.abs(a.x - b.x) * 2 < (a.scaleX + b.scaleX);
                const overlapY = Math.abs(a.y - b.y) * 2 < (a.scaleY + b.scaleY);
                const overlapZ = Math.abs(a.z - b.z) * 2 < (a.scaleZ + b.scaleZ);

                if (overlapX && overlapY && overlapZ) {
                    a.collidingWith.push(b.id);
                    b.collidingWith.push(a.id);

                    // VERIFICACIÓN DE DAÑO DE FACHADA DE COMBATE
                    // Si pertenecen a facciones contrarias (player vs enemy) y no poseen iframes, se ejecutan deducciones lógicas de vida
                    if ((a.faction === 'player' && b.faction === 'enemy') || (a.faction === 'enemy' && b.faction === 'player')) {
                        applyCombatEngagement(a, b);
                    }
                }
            }
        }

        // Runtime API expandida para control lúdico de sistemas de juego
        const api = {
            time: simTime, dt: deltaTime,
            getEntity: (id) => {
                const target = entities.find(e => e.id === id);
                if (!target) return null;
                return {
                    id: target.id, x: target.x, y: target.y, z: target.z,
                    health: target.health, faction: target.faction,
                    inventory: [...target.inventory]
                };
            },
            math: { sin: Math.sin, cos: Math.cos, PI: Math.PI }
        };

        // 3. Despacho lógico de comportamientos inyectados
        for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            ent.isOnDrawing = false; ent.hitWallDrawing = false;

            if (ent.health <= 0) {
                // Nodo Colapsado en batalla: Forzar eyección visual fuera del render pool
                if (floatView) {
                    const offset = ent.index * 3;
                    floatView[offset] = 0; floatView[offset + 1] = -9999.0; floatView[offset + 2] = 0;
                }
                continue;
            }

            // Mapeador espacial de lienzo a rejilla 3D
            const mapPlaneCoordinate = (worldX, worldZ, canvasGrid) => {
                if (!canvasGrid || !canvasGrid.grid) return -1;
                const res = canvasGrid.resolution;
                const normX = (worldX + 20) / 40; const normZ = (worldZ + 20) / 40;
                if (normX >= 0 && normX <= 1 && normZ >= 0 && normZ <= 1) {
                    return Math.min(res - 1, Math.floor(normZ * res)) * res + Math.min(res - 1, Math.floor(normX * res));
                }
                return -1;
            };

            const bgIdx = mapPlaneCoordinate(ent.x, ent.z, artGrids.background);
            if (bgIdx !== -1 && artGrids.background.grid[bgIdx] === 1) ent.isOnDrawing = true;

            if (ent.behavior) {
                try {
                    ent.time = simTime; ent.dt = deltaTime;

                    // Métodos de juego expuestos de manera quirúrgica
                    ent.health = ent.health;
                    ent.hasItem = (itemId) => ent.inventory.includes(itemId);
                    ent.addItem = (itemId) => { ent.inventory.push(itemId); syncGameplayToUI(ent); };

                    ent.moveTowards = (tx, ty, tz, speed) => {
                        const dx = tx - ent.x; const dy = ty - ent.y; const dz = tz - ent.z;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist > 0.01) {
                            const step = Math.min(speed * deltaTime, dist);
                            ent.x += (dx / dist) * step; ent.y += (dy / dist) * step; ent.z += (dz / dist) * step;
                        }
                    };

                    ent.behavior(ent, api);

                    const fgIdx = mapPlaneCoordinate(ent.x, ent.z, artGrids.foreground);
                    if (fgIdx !== -1 && artGrids.foreground.grid[fgIdx] === 1) {
                        ent.x = ent.oldX; ent.y = ent.oldY; ent.z = ent.oldZ;
                        ent.hitWallDrawing = true;
                    }
                } catch (e) {
                    ent.behavior = null;
                }
            }
        }

        // 4. Volcado binario O(1) masivo de posiciones válidas
        if (floatView) {
            for (let i = 0; i < entities.length; i++) {
                const ent = entities[i];
                if (ent.health <= 0) continue;
                const offset = ent.index * 3;
                floatView[offset] = ent.x;
                floatView[offset + 1] = ent.y;
                floatView[offset + 2] = ent.z;
            }
        }

        const endTick = performance.now();
        expectedTickTime += TICK_INTERVAL;
        const nextTimeoutDelay = Math.max(0, TICK_INTERVAL - (endTick - startTick) - (startTick - (expectedTickTime - TICK_INTERVAL)));

        self.postMessage({
            type: 'TELEMETRY_DATA',
            payload: { fps: 1000 / TICK_INTERVAL, delta: TICK_INTERVAL, workerLoad: endTick - startTick }
        });

        setTimeout(executionStep, nextTimeoutDelay);
    }

    setTimeout(executionStep, TICK_INTERVAL);
}

// LOGICA COMBAT INTEGRADA BAJO FILTRADO DE IFRAMES
function applyCombatEngagement(a, b) {
    if (a.iframeWindow <= 0) {
        a.health = Math.max(0, a.health - b.attackPower);
        a.iframeWindow = 0.5; // 500ms de inmunidad táctica
        syncGameplayToUI(a);
    }
    if (b.iframeWindow <= 0) {
        b.health = Math.max(0, b.health - a.attackPower);
        b.iframeWindow = 0.5;
        syncGameplayToUI(b);
    }
}

// NOTIFICACIÓN ASINCRONA CONTROLADA DE CAMBIOS DE ESTADO DE JUEGO A LA INTERFAZ
function syncGameplayToUI(ent) {
    self.postMessage({
        type: 'PATCH',
        payload: {
            [ent.id]: {
                gameplay: { faction: ent.faction, health: ent.health, maxHealth: ent.maxHealth, attackPower: ent.attackPower, inventory: [...ent.inventory] }
            }
        }
    });
}