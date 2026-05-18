// src-tauri/src/lib.rs
use tauri::Manager;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// Valida defensivamente si el ejecutable está corriendo en modo Runtime Autónomo
/// mediante la comprobación de existencia física del paquete de datos de escena embebido.
fn is_runtime_mode(app_handle: &tauri::AppHandle) -> bool {
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let standalone_payload = resource_path.join("resources").join("app.stars");
        return standalone_payload.exists();
    }
    false
}

#[tauri::command]
async fn save_scene(app_handle: tauri::AppHandle, data: Value) -> Result<(), String> {
    if is_runtime_mode(&app_handle) {
        return Err("Operación Denegada: El Kernel se encuentra en modo Runtime de producción cerrado.".to_string());
    }

    let app_data_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Fallo de resolución de ruta en $APPDATA: {}", e))?;

    let scenes_dir = app_data_path.join("scenes");
    fs::create_dir_all(&scenes_dir)
        .map_err(|e| format!("Fallo crítico al inicializar directorios de persistencia: {}", e))?;

    let file_path = scenes_dir.join("current_scene.stars");
    let json_string = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Fallo de serialización JSON: {}", e))?;

    fs::write(&file_path, json_string)
        .map_err(|e| format!("Fallo de I/O escribiendo la escena en disco: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_scene(app_handle: tauri::AppHandle) -> Result<Value, String> {
    // FLUJO RUNTIME AUTÓNOMO: Intenta extraer la escena desde los recursos empaquetados aislados
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let standalone_payload = resource_path.join("resources").join("app.stars");
        if standalone_payload.exists() {
            let content = fs::read_to_string(&standalone_payload)
                .map_err(|e| format!("Error de I/O leyendo el payload del juego empaquetado: {}", e))?;
            let data: Value = serde_json::from_str(&content)
                .map_err(|e| format!("Fallo de análisis sintáctico del bundle embebido: {}", e))?;
            return Ok(data);
        }
    }

    // FLUJO MOTOR / STUDIO: Carga el entorno de desarrollo local desde AppData
    let app_data_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Fallo de resolución de ruta en $APPDATA: {}", e))?;

    let file_path = app_data_path.join("scenes").join("current_scene.stars");

    if !file_path.exists() {
        return Ok(Value::Null);
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Fallo de I/O leyendo estado de escena de desarrollo: {}", e))?;

    let data: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Fallo de deserialización del estado de escena: {}", e))?;

    Ok(data)
}

#[tauri::command]
async fn save_script(app_handle: tauri::AppHandle, file_name: String, code: String) -> Result<(), String> {
    if is_runtime_mode(&app_handle) {
        return Err("Inyección lógica denegada: La compilación en caliente está desactivada en producción.".to_string());
    }

    let app_data_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Fallo de resolución de ruta en $APPDATA para scripts: {}", e))?;

    let scripts_dir = app_data_path.join("scripts");
    fs::create_dir_all(&scripts_dir)
        .map_err(|e| format!("Fallo al inicializar contenedor de scripts nativos: {}", e))?;

    let file_path = scripts_dir.join(file_name);
    fs::write(&file_path, code)
        .map_err(|e| format!("Fallo de I/O al escribir el componente lógico del nodo: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn export_standalone_game(app_handle: tauri::AppHandle, target_path: String, data: Value) -> Result<(), String> {
    let file_path = PathBuf::from(target_path);
    
    // 1. Obtener la ruta física del ejecutable actual del motor (El Player Runner base)
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("No se pudo resolver la firma del binario actual: {}", e))?;

    // 2. Definir el directorio de destino del ejecutable final empaquetado del usuario
    if let Some(parent_dir) = file_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Fallo al estructurar el árbol de directorios de exportación: {}", e))?;
    }

    // 3. Clonar de forma binaria el ejecutable actual para convertirlo en el nuevo "Player" autónomo
    fs::copy(&current_exe, &file_path)
        .map_err(|e| format!("Fallo crítico al duplicar el binario base del Player: {}", e))?;

    // 4. Crear el directorio de recursos embebidos aislado junto al nuevo ejecutable exportado
    let target_dir = file_path.parent().unwrap();
    let resource_dir = target_dir.join("resources");
    fs::create_dir_all(&resource_dir)
        .map_err(|e| format!("Fallo al construir la jaula de recursos empaquetados: {}", e))?;

    // 5. Serializar e inyectar la carga de la escena dentro del contenedor de recursos protegidos
    let payload_path = resource_dir.join("app.stars");
    let json_string = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Fallo de serialización del payload del juego: {}", e))?;

    fs::write(&payload_path, json_string)
        .map_err(|e| format!("Fallo de I/O escribiendo el asset de escena empaquetado final: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            save_script,
            export_standalone_game
        ])
        .run(tauri::generate_context!())
        .expect("Error fatal irreversible durante la ejecución del Kernel nativo de Tauri");
}