import { readFile, writeTextFile, readTextFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';

/**
 * TauriBridge: Interfaz nativa optimizada para STARS ENGINE V1.0.
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

    // Persistencia local de comportamientos inyectados en caliente
    async saveScript(fileName, content) {
        try {
            // CORRECCIÓN PREDICTIVA: Garantizar la existencia de la subcarpeta antes de la escritura
            await mkdir('scripts', { baseDir: BaseDirectory.AppData, recursive: true });

            await writeTextFile(`scripts/${fileName}`, content, {
                baseDir: BaseDirectory.AppData
            });
            console.log(`[Stars Bridge]: Script ${fileName} guardado exitosamente.`);
        } catch (err) {
            console.error("[Stars Bridge Error]: Error de escritura en disco al salvar script:", err);
        }
    },

    // --- PIPELINE DEL SERIALIZADOR DE ESCENAS NATIVO ---
    async saveScene(sceneData) {
        try {
            // CORRECCIÓN PREDICTIVA: Garantizar la existencia de la subcarpeta antes de la serialización
            await mkdir('scenes', { baseDir: BaseDirectory.AppData, recursive: true });

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