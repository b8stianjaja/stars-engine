// src/core/bridge/bridge.tauri.js
import { useSystemicStore } from '../engine.store';

// ENVIRONMENT DETECTOR (Mandate 6 Compliance)
const isTauriEnvironment = () => {
    return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
};

export const TauriBridge = {
    /**
     * Executes real-time back-migration and bundles state data for file-system serialization.
     * Enforces direct variable parameter mapping matching Rust's expected snake_case structures.
     */
    saveScene: async (filePath = null) => {
        // Force synchronous state back-migration from SharedArrayBuffer into Zustand cache
        if (typeof window.__STARS_ENGINE_BACK_MIGRATE__ === 'function') {
            window.__STARS_ENGINE_BACK_MIGRATE__();
        }

        const currentStore = useSystemicStore.getState();

        // Construct the Unified Storyboard Bundle structure (.stars format specification)
        const projectBundle = {
            scene_registry: currentStore.sceneRegistry ?? {},
            current_scene_id: currentStore.currentSceneId ?? 'default_sandbox',
            entities: currentStore.entities ?? {},
            camera: currentStore.workspace?.directorCameraData ?? null,
            editor_visible: !currentStore.workspace?.isBuildRuntime
        };

        if (isTauriEnvironment()) {
            try {
                // FFI Invocation matching expected Rust structural mapping parameters
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('save_project_bundle', {
                    target_path: filePath,
                    scene_data: projectBundle,
                    file_name: `project_${projectBundle.current_scene_id}.stars`
                });
                console.log('[FFI Bridge] Native project bundle successfully committed to local storage disk.');
                return true;
            } catch (error) {
                console.error('[FFI Bridge] Native filesystem serialization failure:', error.message);
                return false;
            }
        } else {
            // WEB SANDBOX FALLBACK LAYER: Execute direct client-side raw Blob stream download
            try {
                const serializedData = JSON.stringify(projectBundle, null, 2);
                localStorage.setItem(`stars_backup_${projectBundle.current_scene_id}`, serializedData);

                const dataBlob = new Blob([serializedData], { type: 'application/json' });
                const blobUrl = URL.createObjectURL(dataBlob);

                const anchorElement = document.createElement('a');
                anchorElement.href = blobUrl;
                anchorElement.download = `sandbox_bundle_${projectBundle.current_scene_id}.stars`;
                document.body.appendChild(anchorElement);
                anchorElement.click();

                document.body.removeChild(anchorElement);
                URL.revokeObjectURL(blobUrl);
                console.log('[FFI Bridge] Browser sandbox project bundle successfully written via Native Blob URL.');
                return true;
            } catch (error) {
                console.error('[FFI Bridge] Web sandbox fallback serialization failure:', error.message);
                return false;
            }
        }
    },

    /**
     * Hydrates the entire engine schema via native filesystem streams or fallback local registers.
     */
    loadScene: async (filePath = null) => {
        if (isTauriEnvironment()) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const loadedBundle = await invoke('load_project_bundle', {
                    target_path: filePath
                });

                if (loadedBundle && typeof loadedBundle === 'object') {
                    // Normalize native snake_case format into frontend camelCase parameters cleanly
                    return {
                        sceneRegistry: loadedBundle.scene_registry,
                        currentSceneId: loadedBundle.current_scene_id,
                        entities: loadedBundle.entities,
                        directorCameraData: loadedBundle.camera,
                        editorVisible: loadedBundle.editor_visible
                    };
                }
            } catch (error) {
                console.warn('[FFI Bridge] Native disk read bypassed or failed. Diverting execution to environment hydration routers.');
            }
        } else {
            try {
                const fallbackData = localStorage.getItem('stars_backup_default_sandbox');
                if (fallbackData) {
                    const parsedBundle = JSON.parse(fallbackData);
                    return {
                        sceneRegistry: parsedBundle.scene_registry,
                        currentSceneId: parsedBundle.current_scene_id,
                        entities: parsedBundle.entities,
                        directorCameraData: parsedBundle.camera,
                        editorVisible: parsedBundle.editor_visible
                    };
                }
            } catch (error) {
                console.error('[FFI Bridge] Web sandbox hydration engine parse failure:', error.message);
            }
        }
        return null;
    }
};