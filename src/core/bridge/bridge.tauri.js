import { readBinaryFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';

export const TauriBridge = {
    async loadAsset(path) {
        try { return await readBinaryFile(path); }
        catch (err) { console.error("[Bridge Error]:", err); }
    },
    async saveScript(fileName, content) {
        await writeTextFile(`scripts/${fileName}`, content);
    }
};