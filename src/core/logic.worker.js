let sharedBuffer;
let floatView;
let entities = [];

self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT_MEM':
            sharedBuffer = payload;
            floatView = new Float32Array(sharedBuffer);
            // Limpiar el buffer al inicio
            floatView.fill(0);
            startLoop();
            break;
        case 'ADD_ENTITY_LOGIC':
            entities.push({
                id: payload.id,
                index: payload.index,
                x: 0, y: 0, z: 0,
                phi: Math.random() * Math.PI * 2,
                radius: 2 + Math.random() * 2
            });
            break;
    }
};

function startLoop() {
    setInterval(() => {
        updatePhysics();

        // Sincronización de latencia cero vía SharedArrayBuffer 
        for (let ent of entities) {
            const offset = ent.index * 3;
            if (floatView) {
                floatView[offset] = ent.x;
                floatView[offset + 1] = ent.y;
                floatView[offset + 2] = ent.z;
            }
        }
    }, 1000 / 60); // Tick-rate fijo 60Hz [cite: 9]
}

function updatePhysics() {
    entities.forEach(ent => {
        // Movimiento orbital suave para validación visual
        ent.phi += 0.01;
        ent.x = Math.cos(ent.phi) * ent.radius;
        ent.z = Math.sin(ent.phi) * ent.radius;
        ent.y = Math.sin(ent.phi * 2) * 0.5;
    });
}