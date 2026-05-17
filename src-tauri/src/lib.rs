// src-tauri/src/lib.rs
use tauri::Manager;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

// NOTA DE ARQUITECTURA: Sin el modificador 'pub' para prevenir colisiones macro E0255
#[tauri::command]
async fn save_scene(app_handle: tauri::AppHandle, data: Value) -> Result<(), String> {
    let app_data_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Fallo de resolución de ruta en $APPDATA: {}", e))?;

    let scenes_dir = app_data_path.join("scenes");

    // ESCRITURA DEFENSIVA: Forzar la creación del árbol de directorios de almacenamiento
    fs::create_dir_all(&scenes_dir)
        .map_err(|e| format!("Fallo crítico de sistema de archivos al crear directorios: {}", e))?;

    let file_path = scenes_dir.join("current_scene.stars");

    let json_string = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Fallo de serialización JSON: {}", e))?;

    fs::write(&file_path, json_string)
        .map_err(|e| format!("Fallo de I/O de bajo nivel al escribir en disco: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_scene(app_handle: tauri::AppHandle) -> Result<Value, String> {
    let app_data_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Fallo de resolución de ruta en $APPDATA: {}", e))?;

    let file_path = app_data_path.join("scenes").join("current_scene.stars");

    if !file_path.exists() {
        return Ok(Value::Null);
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Fallo de I/O de bajo nivel al leer desde disco: {}", e))?;

    let data: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Fallo de deserialización del estado de escena: {}", e))?;

    Ok(data)
}

#[tauri::command]
async fn export_standalone_game(target_path: String, data: Value) -> Result<(), String> {
    let file_path = PathBuf::from(target_path);

    if let Some(parent_dir) = file_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Fallo al estructurar el árbol del directorio de exportación: {}", e))?;
    }

    let json_string = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Fallo de serialización de bundle compilado: {}", e))?;

    fs::write(&file_path, json_string)
        .map_err(|e| format!("Fallo de I/O al exportar paquete distribuible del juego: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Inicialización de los plugins necesarios para el motor (Acceso a Disco y Diálogos)
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            if cfg!(debug_assertions) {
                _app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_scene,
            load_scene,
            export_standalone_game
        ])
        .run(tauri::generate_context!())
        .expect("Error fatal irreversible durante la ejecución del Kernel nativo de Tauri");
}