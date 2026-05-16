/**
 * STARS ENGINE V1.0 - Core Simulation Worker
 * Proprocesamiento físico a 60Hz bajo esquema Stride 16 Floats.
 */

let sharedBuffer = null;
let floatView = null;
let entities = [];
let simTime = 0;
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

let artGrids = { foreground: { resolution: 64, frames: {} }, background: { resolution: 64, frames: {} } };

const STRIDE = 16;
const P_X = 0, P_Y = 1, P_Z = 2;
const V_X = 3, V_Y = 4, V_Z = 5;
const S_X = 6, S_Y = 7, S_Z = 8;
const ROT = 9;
const ANIM_ROW = 10;
const FRAME_IDX = 11;
const COL_MASK = 12;
const COL_TYPE = 13;
const GAME_HP = 14;
const ACTOR_STATE = 15;

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
            vx: 0, vy: 0, vz: 0,
            scaleX: payload.scaleX ?? 1, scaleY: payload.scaleY ?? 1, scaleZ: payload.scaleZ ?? 1,
            baseX: payload.x ?? 0, baseY: payload.y ?? 0, baseZ: payload.z ?? 0,
            rotation: 0,
            animRow: payload.gameplay?.animRow ?? 0,
            frameIndex: payload.gameplay?.frameIndex ?? 0,
            collisionMask: 1,
            colliderType: payload.colliderType ?? 1, // 1: Cilindro Basal, 2: AABB
            faction: payload.gameplay?.faction || 'neutral',
            health: payload.gameplay?.health || 100,
            maxHealth: payload.gameplay?.maxHealth || 100,
            attackPower: payload.gameplay?.damage || 15,
            inventory: payload.gameplay?.inventory || [],
            actorState: 0,
            iframeWindow: 0,
            collidingWith: [],
            behavior: null
        });
    },

    REMOVE_ENTITY_LOGIC: (payload) => {
        const targetIndex = entities.findIndex(e => e.id === payload.id);
        if (targetIndex !== -1) {
            const ent = entities[targetIndex];
            if (floatView) {
                const offset = ent.index * STRIDE;
                floatView.fill(0, offset, offset + STRIDE);
                floatView[offset + P_Y] = -9999.0;
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

            if (payload.gameplay) {
                if (payload.gameplay.faction !== undefined) target.faction = payload.gameplay.faction;
                if (payload.gameplay.health !== undefined) target.health = payload.gameplay.health;
                if (payload.gameplay.damage !== undefined) target.attackPower = payload.gameplay.damage;
                if (payload.gameplay.inventory !== undefined) target.inventory = [...payload.gameplay.inventory];
                if (payload.gameplay.animRow !== undefined) target.animRow = payload.gameplay.animRow;
                if (payload.gameplay.frameIndex !== undefined) target.frameIndex = payload.gameplay.frameIndex;
                if (payload.gameplay.actorState !== undefined) target.actorState = payload.gameplay.actorState;
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
            vx: 0, vy: 0, vz: 0,
            scaleX: e.scale[0], scaleY: e.scale[1], scaleZ: e.scale[2],
            baseX: e.position[0], baseY: e.position[1], baseZ: e.position[2],
            rotation: 0,
            animRow: e.gameplay?.animRow || 0,
            frameIndex: e.gameplay?.frameIndex || 0,
            collisionMask: 1, colliderType: 1,
            faction: e.gameplay?.faction || 'neutral',
            health: e.gameplay?.health || 100,
            maxHealth: e.gameplay?.maxHealth || 100,
            attackPower: e.gameplay?.damage || 15,
            inventory: e.gameplay?.inventory || [],
            actorState: 0, iframeWindow: 0,
            collidingWith: [], behavior: null
        }));

        payload.forEach(e => {
            if (e.scriptCode && e.scriptCode.trim() !== '') {
                try {
                    const behaviorFunc = new Function('ent', 'api', e.scriptCode);
                    const target = entities.find(t => t.id === e.id);
                    if (target) target.behavior = behaviorFunc;
                } catch (err) {
                    console.error(err.message);
                }
            }
        });
    },

    UPDATE_CANVAS_GRID: (payload) => {
        if (!artGrids[payload.layer]) {
            artGrids[payload.layer] = { resolution: payload.resolution, frames: {} };
        }
        artGrids[payload.layer].frames[payload.frameIndex] = payload.grid;
    }
};

function runSimulation() {
    let expectedTickTime = performance.now();

    function executionStep() {
        const startTick = performance.now();
        const deltaTime = TICK_INTERVAL / 1000;
        simTime += deltaTime;

        for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            ent.oldX = ent.x; ent.oldY = ent.y; ent.oldZ = ent.z;
            if (ent.iframeWindow > 0) ent.iframeWindow -= deltaTime;
        }

        // Colisionador Basal de Deslizamiento Continuo (XZ)
        for (let i = 0; i < entities.length; i++) entities[i].collidingWith = [];
        for (let i = 0; i < entities.length; i++) {
            const a = entities[i];
            if (a.health <= 0 || a.collisionMask === 0) continue;

            for (let j = i + 1; j < entities.length; j++) {
                const b = entities[j];
                if (b.health <= 0 || b.collisionMask === 0) continue;

                const dx = a.x - b.x;
                const dz = a.z - b.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                const rA = (a.scaleX + a.scaleZ) / 4;
                const rB = (b.scaleX + b.scaleZ) / 4;
                const hOverlap = Math.abs(a.y - b.y) * 2 < (a.scaleY + b.scaleY);

                if (distance < (rA + rB) && hOverlap) {
                    a.collidingWith.push(b.id);
                    b.collidingWith.push(a.id);

                    if (distance > 0.001) {
                        const overlap = (rA + rB) - distance;
                        const pX = (dx / distance) * overlap * 0.5;
                        const pZ = (dz / distance) * overlap * 0.5;
                        a.x += pX; a.z += pZ;
                        b.x -= pX; b.z -= pZ;
                    }

                    if ((a.faction === 'player' && b.faction === 'enemy') || (a.faction === 'enemy' && b.faction === 'player')) {
                        if (a.iframeWindow <= 0) {
                            a.health = Math.max(0, a.health - b.attackPower);
                            a.actorState = 3; a.iframeWindow = 0.4;
                            syncGameplayToUI(a);
                        }
                        if (b.iframeWindow <= 0) {
                            b.health = Math.max(0, b.health - a.attackPower);
                            b.actorState = 3; b.iframeWindow = 0.4;
                            syncGameplayToUI(b);
                        }
                    }
                }
            }
        }

        const api = {
            time: simTime, dt: deltaTime,
            getEntity: (id) => {
                const t = entities.find(e => e.id === id);
                if (!t) return null;
                return { id: t.id, x: t.x, y: t.y, z: t.z, health: t.health, faction: t.faction, inventory: [...t.inventory] };
            },
            math: { sin: Math.sin, cos: Math.cos, PI: Math.PI }
        };

        for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            if (ent.health <= 0) continue;

            if (ent.behavior) {
                try {
                    ent.time = simTime; ent.dt = deltaTime;
                    ent.hasItem = (itemId) => ent.inventory.includes(itemId);
                    ent.addItem = (itemId) => { ent.inventory.push(itemId); syncGameplayToUI(ent); };

                    ent.moveTowards = (tx, ty, tz, speed) => {
                        const dx = tx - ent.x; const dy = ty - ent.y; const dz = tz - ent.z;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist > 0.01) {
                            ent.actorState = 1;
                            ent.vx = (dx / dist) * speed; ent.vz = (dz / dist) * speed;
                            ent.x += ent.vx * deltaTime; ent.z += ent.vz * deltaTime;
                            ent.rotation = Math.atan2(-ent.vz, ent.vx);
                        } else {
                            ent.actorState = 0; ent.vx = 0; ent.vz = 0;
                        }
                    };

                    ent.behavior(ent, api);

                    // Validación del mapa de bits de colisiones dinámicas del lienzo
                    const grid = artGrids.foreground;
                    if (grid && grid.frames && grid.frames[ent.frameIndex]) {
                        const res = grid.resolution;
                        const nX = (ent.x + 20) / 40; const nZ = (ent.z + 20) / 40;
                        if (nX >= 0 && nX <= 1 && nZ >= 0 && nZ <= 1) {
                            const idx = Math.min(res - 1, Math.floor(nZ * res)) * res + Math.min(res - 1, Math.floor(nX * res));
                            if (grid.frames[ent.frameIndex][idx] === 1) {
                                ent.x = ent.oldX; ent.z = ent.oldZ;
                                ent.vx = 0; ent.vz = 0;
                            }
                        }
                    }
                } catch (e) {
                    ent.behavior = null;
                }
            }
        }

        if (floatView) {
            for (let i = 0; i < entities.length; i++) {
                const ent = entities[i];
                const offset = ent.index * STRIDE;
                floatView[offset + P_X] = ent.x; floatView[offset + P_Y] = ent.y; floatView[offset + P_Z] = ent.z;
                floatView[offset + V_X] = ent.vx; floatView[offset + V_Y] = ent.vy; floatView[offset + V_Z] = ent.vz;
                floatView[offset + S_X] = ent.scaleX; floatView[offset + S_Y] = ent.scaleY; floatView[offset + S_Z] = ent.scaleZ;
                floatView[offset + ROT] = ent.rotation; floatView[offset + ANIM_ROW] = ent.animRow;
                floatView[offset + FRAME_IDX] = ent.frameIndex; floatView[offset + COL_MASK] = ent.collisionMask;
                floatView[offset + COL_TYPE] = ent.colliderType; floatView[offset + GAME_HP] = ent.health;
                floatView[offset + ACTOR_STATE] = ent.actorState;
            }
        }

        const endTick = performance.now();
        expectedTickTime += TICK_INTERVAL;
        setTimeout(executionStep, Math.max(0, TICK_INTERVAL - (endTick - startTick)));
    }
    setTimeout(executionStep, TICK_INTERVAL);
}

function syncGameplayToUI(ent) {
    self.postMessage({
        type: 'PATCH',
        payload: {
            [ent.id]: {
                gameplay: { faction: ent.faction, health: ent.health, maxHealth: ent.maxHealth, damage: ent.attackPower, inventory: [...ent.inventory], animRow: ent.animRow, frameIndex: ent.frameIndex, actorState: ent.actorState }
            }
        }
    });
}