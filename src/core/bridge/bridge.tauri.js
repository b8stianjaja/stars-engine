// src/core/bridge/bridge.tauri.js
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

export class TauriBridge {
    /**
     * Guarda el estado de la escena actual de forma defensiva en el almacenamiento local ($APPDATA)
     * @param {Object} sceneData - Datos de la escena estructurados bajo la Trinidad de Memoria
     * @returns {Promise<boolean>}
     */
    static async saveScene(sceneData) {
        try {
            await invoke('save_scene', { data: sceneData ?? {} });
            return true;
        } catch (error) {
            console.error(`[TauriBridge] Error crítico en operación 'saveScene':`, error);
            return false;
        }
    }

    /**
     * Recupera el estado serializado de la escena desde el almacenamiento local ($APPDATA)
     * @returns {Promise<Object|null>}
     */
    static async loadScene() {
        try {
            const data = await invoke('load_scene');
            return data || null;
        } catch (error) {
            console.error(`[TauriBridge] Error crítico en operación 'loadScene':`, error);
            return null;
        }
    }

    /**
     * Invoca el diálogo nativo de Tauri v2 para exportar el juego empaquetado a una ubicación externa
     * @param {Object} sceneData - Datos completos de la escena e ilustraciones
     * @returns {Promise<boolean>}
     */
    static async exportStandaloneScene(sceneData) {
        try {
            const selectedPath = await save({
                title: 'Exportar Proyecto Terminado - STARS ENGINE',
                filters: [{
                    name: 'Stars Engine Game Bundle',
                    extensions: ['stars']
                }]
            });

            if (!selectedPath) {
                console.log("[TauriBridge] Exportación cancelada por el operador.");
                return false;
            }

            await invoke('export_standalone_game', {
                targetPath: selectedPath,
                data: sceneData ?? {}
            });

            return true;
        } catch (error) {
            console.error(`[TauriBridge] Error crítico durante la exportación standalone:`, error);
            return false;
        }
    }
}