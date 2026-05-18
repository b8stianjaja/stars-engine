// src/core/bridge/bridge.tauri.js
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

const isTauriEnvironment = () => {
    return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
};

export class TauriBridge {
    static async saveScene(sceneData) {
        const payload = sceneData ?? {};
        if (!isTauriEnvironment()) {
            localStorage.setItem('stars_engine_current_scene', JSON.stringify(payload));
            return true;
        }
        try {
            await invoke('save_scene', { data: payload });
            return true;
        } catch (error) {
            console.error(`[TauriBridge] Error en 'saveScene':`, error);
            return false;
        }
    }

    static async loadScene() {
        if (!isTauriEnvironment()) {
            const localData = localStorage.getItem('stars_engine_current_scene');
            return localData ? JSON.parse(localData) : null;
        }
        try {
            return await invoke('load_scene');
        } catch (error) {
            console.error(`[TauriBridge] Error en 'loadScene':`, error);
            return null;
        }
    }

    static async saveScript(fileName, code) {
        if (!isTauriEnvironment()) {
            localStorage.setItem(`stars_script_${fileName}`, code);
            return true;
        }
        try {
            await invoke('save_script', { file_name: fileName, code });
            return true;
        } catch (error) {
            console.error(`[TauriBridge] Error en 'saveScript':`, error);
            return false;
        }
    }

    /**
     * Dispara la clonación binaria del binario actual para escribir el juego .exe independiente
     */
    static async exportStandaloneScene(sceneData) {
        if (!isTauriEnvironment()) {
            // Fallback de contingencia seguro en modo Web Navegador
            const jsonString = JSON.stringify(sceneData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'juego_autonomo.stars';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        }

        try {
            // Lanzar el cuadro de diálogo nativo de guardado de Windows para elegir la ruta del nuevo ejecutable
            const selectedPath = await save({
                title: 'Compilar y Exportar Juego Independiente (.exe)',
                filters: [{
                    name: 'Ejecutable Autónomo de Windows',
                    extensions: ['exe']
                }]
            });

            if (!selectedPath) return false;

            // Invocar el comando de clonación binaria profunda e inyección del paquete
            await invoke('export_standalone_game', {
                targetPath: selectedPath,
                data: sceneData ?? {}
            });

            return true;
        } catch (error) {
            console.error(`[TauriBridge] Error crítico durante la exportación del binario autónomo:`, error);
            return false;
        }
    }
}