import { readFile, writeTextFile, readTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

/**
 * TauriBridge: Interfaz nativa para Tauri 2.
 */
export const TauriBridge = {
    // Carga de activos binarios pesados saltando restricciones del navegador
    async loadAsset(path) {
        try {
            return await readFile(path, { baseDir: BaseDirectory.AppData });
        } catch (err) {
            console.error("[Stars Bridge Error]: Fallo al cargar activo:", err);
            return null;
        }
    },

    // Persistencia local de comportamientos inyectados
    async saveScript(fileName, content) {
        try {
            await writeTextFile(`scripts/${fileName}`, content, {
                baseDir: BaseDirectory.AppData
            });
            console.log(`[Stars Bridge]: Script ${fileName} guardado exitosamente.`);
        } catch (err) {
            console.error("[Stars Bridge Error]: Error de escritura en disco:", err);
        }
    },

    // --- PIPELINE DEL SERIALIZADOR DE ESCENAS NATIVO ---
    async saveScene(sceneData) {
        try {
            await writeTextFile('scenes/main_scene.json', JSON.stringify(sceneData, null, 4), {
                baseDir: BaseDirectory.AppData
            });
            console.log("[Stars Bridge]: Estado cinemático de la escena serializado con éxito.");
            return true;
        } catch (err) {
            console.error("[Stars Bridge Error]: Fallo al guardar la configuración de escena:", err);
            return false;
        }
    },

    async loadScene() {
        try {
            const content = await readTextFile('scenes/main_scene.json', {
                baseDir: BaseDirectory.AppData
            });
            return JSON.parse(content);
        } catch (err) {
            console.error("[Stars Bridge Error]: Fallo al deserializar escena desde disco nativo:", err);
            return null;
        }
    }
};