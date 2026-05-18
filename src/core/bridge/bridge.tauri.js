// src/core/bridge/bridge.tauri.js
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

// DETECCIÓN DEFENSIVA DEL ENTORNO NATIVO TAURI
const isTauriEnvironment = () => {
    return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
};

export class TauriBridge {
    /**
     * Guarda el estado de la escena de forma defensiva.
     * Si corre en el navegador, utiliza el almacenamiento aislado local de la web.
     * @param {Object} sceneData 
     * @returns {Promise<boolean>}
     */
    static async saveScene(sceneData) {
        const payload = sceneData ?? {};

        if (!isTauriEnvironment()) {
            try {
                localStorage.setItem('stars_engine_current_scene', JSON.stringify(payload));
                console.log("[TauriBridge - Web Mode] Escena persistida en el LocalStorage de forma segura.");
                return true;
            } catch (error) {
                console.error("[TauriBridge - Web Mode] Fallo al escribir en LocalStorage:", error);
                return false;
            }
        }

        try {
            await invoke('save_scene', { data: payload });
            return true;
        } catch (error) {
            console.error(`[TauriBridge - Native Mode] Error crítico en operación 'saveScene':`, error);
            return false;
        }
    }

    /**
     * Recupera el estado serializado de la escena actual.
     * Soporta fallback automático a LocalStorage si se ejecuta fuera de Tauri.
     * @returns {Promise<Object|null>}
     */
    static async loadScene() {
        if (!isTauriEnvironment()) {
            try {
                const localData = localStorage.getItem('stars_engine_current_scene');
                if (!localData) return null;
                console.log("[TauriBridge - Web Mode] Escena recuperada del LocalStorage con éxito.");
                return JSON.parse(localData);
            } catch (error) {
                console.error("[TauriBridge - Web Mode] Fallo al leer desde LocalStorage:", error);
                return null;
            }
        }

        try {
            const data = await invoke('load_scene');
            return data || null;
        } catch (error) {
            console.error(`[TauriBridge - Native Mode] Error crítico en operation 'loadScene':`, error);
            return null;
        }
    }

    /**
     * Guarda un script de comportamiento lógico asignado a una entidad.
     * @param {string} fileName 
     * @param {string} code 
     * @returns {Promise<boolean>}
     */
    static async saveScript(fileName, code) {
        const targetName = fileName ?? 'unnamed_script.js';
        const targetCode = code ?? '';

        if (!isTauriEnvironment()) {
            try {
                localStorage.setItem(`stars_script_${targetName}`, targetCode);
                console.log(`[TauriBridge - Web Mode] Script [${targetName}] guardado en la Sandbox Web.`);
                return true;
            } catch (error) {
                console.error("[TauriBridge - Web Mode] Fallo al guardar script local:", error);
                return false;
            }
        }

        try {
            await invoke('save_script', {
                file_name: targetName,
                code: targetCode
            });
            return true;
        } catch (error) {
            console.error(`[TauriBridge - Native Mode] Error crítico en operación 'saveScript' para ${targetName}:`, error);
            return false;
        }
    }

    /**
     * Exporta el bundle completo utilizando diálogos nativos o descargas en binario Blob por navegador.
     * @param {Object} sceneData 
     * @returns {Promise<boolean>}
     */
    static async exportStandaloneScene(sceneData) {
        const payload = sceneData ?? {};

        if (!isTauriEnvironment()) {
            try {
                // Generar una descarga de archivo nativa en el navegador libre de privilegios de I/O
                const jsonString = JSON.stringify(payload, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const temporaryAnchor = document.createElement('a');
                temporaryAnchor.href = url;
                temporaryAnchor.download = 'proyecto_compilado.stars';
                document.body.appendChild(temporaryAnchor);
                temporaryAnchor.click();

                document.body.removeChild(temporaryAnchor);
                URL.revokeObjectURL(url);
                console.log("[TauriBridge - Web Mode] Bundle distribuible descargado por canal Web Blob.");
                return true;
            } catch (error) {
                console.error("[TauriBridge - Web Mode] Error durante la descarga del bundle:", error);
                return false;
            }
        }

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
                data: payload
            });

            return true;
        } catch (error) {
            console.error(`[TauriBridge - Native Mode] Error crítico durante la exportación standalone:`, error);
            return false;
        }
    }
}