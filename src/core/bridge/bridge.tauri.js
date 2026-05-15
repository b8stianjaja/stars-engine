import { readFile, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

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
                baseDir: BaseDirectory.AppData,
                createNew: true
            });
            console.log(`[Stars Bridge]: Script ${fileName} guardado exitosamente.`);
        } catch (err) {
            console.error("[Stars Bridge Error]: Error de escritura en disco:", err);
        }
    }
};