import { readFile, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

/**
 * TauriBridge: Interfaz nativa corregida para Tauri 2.
 * En la V2, 'readBinaryFile' ha sido renombrada a 'readFile'.
 */
export const TauriBridge = {
    // Carga de activos binarios (X, Y, Z o texturas)
    async loadAsset(path) {
        try {
            // Cambio crítico: readBinaryFile -> readFile
            return await readFile(path, { baseDir: BaseDirectory.AppData });
        } catch (err) {
            console.error("[Stars Bridge Error]: Fallo al cargar activo:", err);
            return null;
        }
    },

    // Persistencia de scripts para el sistema de Behaviors
    async saveScript(fileName, content) {
        try {
            await writeTextFile(`scripts/${fileName}`, content, {
                baseDir: BaseDirectory.AppData,
                createNew: true
            });
            console.log(`[Stars Bridge]: Script ${fileName} guardado.`);
        } catch (err) {
            console.error("[Stars Bridge Error]: Error de escritura:", err);
        }
    }
};