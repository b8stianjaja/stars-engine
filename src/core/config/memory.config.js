// src/core/config/memory.config.js

export const ENGINE_CONFIG = {
    MAX_ENTITIES: 2000,
    STRIDE_FLOATS: 16, // 64 bytes per entity
    INPUT_KEYS: 256,
    TICK_RATE_HZ: 60
};

export const MEMORY_LAYOUT = {
    SHARED_MEM_BYTES: ENGINE_CONFIG.MAX_ENTITIES * ENGINE_CONFIG.STRIDE_FLOATS * 4,
    INPUT_MEM_BYTES: ENGINE_CONFIG.INPUT_KEYS * 4
};

// Singleton para garantizar que la instanciación de memoria ocurra una única vez en el hilo principal
export const EngineMemory = {
    physicsBuffer: new SharedArrayBuffer(MEMORY_LAYOUT.SHARED_MEM_BYTES),
    inputBuffer: new SharedArrayBuffer(MEMORY_LAYOUT.INPUT_MEM_BYTES)
};