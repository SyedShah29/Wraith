#![allow(unused_imports, dead_code)]

use tauri::{Manager, Emitter};
use tauri_plugin_store::StoreExt;
use tauri_plugin_clipboard_manager::ClipboardExt;
use screenshots::Screen;
use base64::{engine::general_purpose, Engine as _};

// ─── Settings ─────────────────────────────────────────────────────────────────
#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> serde_json::Value {
    let store = app.store("wraith-settings.json").unwrap();
    store.get("settings").unwrap_or(serde_json::Value::Null)
}

#[tauri::command]
pub async fn set_settings(app: tauri::AppHandle, settings: serde_json::Value) -> Result<(), String> {
    let store = app.store("wraith-settings.json").map_err(|e| e.to_string())?;
    store.set("settings", settings.clone());
    store.save().map_err(|e| e.to_string())?;
    // Notify all windows (especially the overlay) that settings changed
    let _ = app.emit("wraith://settings-changed", settings);
    Ok(())
}

// ─── Threads ──────────────────────────────────────────────────────────────────
#[tauri::command]
pub async fn get_threads(app: tauri::AppHandle) -> serde_json::Value {
    let store = app.store("wraith-threads.json").unwrap();
    store.get("threads").unwrap_or(serde_json::json!([]))
}

#[tauri::command]
pub async fn save_thread(app: tauri::AppHandle, thread: serde_json::Value) -> Result<(), String> {
    let store = app.store("wraith-threads.json").map_err(|e| e.to_string())?;
    let mut threads = store.get("threads")
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();

    let thread_id = thread.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
    if let Some(pos) = threads.iter().position(|t| t.get("id").and_then(|v| v.as_str()) == Some(&thread_id)) {
        threads[pos] = thread;
    } else {
        if threads.len() >= 100 { threads.remove(0); }
        threads.push(thread);
    }
    store.set("threads", serde_json::json!(threads));
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_thread(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let store = app.store("wraith-threads.json").map_err(|e| e.to_string())?;
    let threads = store.get("threads")
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .filter(|t| t.get("id").and_then(|v| v.as_str()) != Some(&id))
        .collect::<Vec<_>>();
    store.set("threads", serde_json::json!(threads));
    store.save().map_err(|e| e.to_string())
}

// ─── Playbooks ────────────────────────────────────────────────────────────────
#[tauri::command]
pub async fn get_playbooks(app: tauri::AppHandle) -> serde_json::Value {
    let store = app.store("wraith-playbooks.json").unwrap();
    store.get("playbooks").unwrap_or(serde_json::json!([]))
}

#[tauri::command]
pub async fn save_playbook(app: tauri::AppHandle, playbook: serde_json::Value) -> Result<(), String> {
    let store = app.store("wraith-playbooks.json").map_err(|e| e.to_string())?;
    let mut playbooks = store.get("playbooks")
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();

    let pb_id = playbook.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
    if let Some(pos) = playbooks.iter().position(|p| p.get("id").and_then(|v| v.as_str()) == Some(&pb_id)) {
        playbooks[pos] = playbook;
    } else {
        playbooks.push(playbook);
    }
    store.set("playbooks", serde_json::json!(playbooks));
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_playbook(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let store = app.store("wraith-playbooks.json").map_err(|e| e.to_string())?;
    let playbooks = store.get("playbooks")
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .filter(|p| p.get("id").and_then(|v| v.as_str()) != Some(&id))
        .collect::<Vec<_>>();
    store.set("playbooks", serde_json::json!(playbooks));
    store.save().map_err(|e| e.to_string())
}

// ─── Screen capture ───────────────────────────────────────────────────────────
// Save screenshot to temp PNG file, read bytes, base64 encode.
// This avoids any image crate version conflicts.
#[derive(serde::Serialize)]
pub struct ScreenCapture {
    pub base64: String,
    pub text: String,
}

#[tauri::command]
pub async fn capture_screen() -> Result<ScreenCapture, String> {
    tokio::task::spawn_blocking(|| {
        let screens = Screen::all().map_err(|e| e.to_string())?;
        let screen = screens.first().ok_or("No screen found")?;
        let captured = screen.capture().map_err(|e| e.to_string())?;

        let tmp = std::env::temp_dir().join("wraith_screen.png");
        let tmp_txt_prefix = std::env::temp_dir().join("wraith_screen");
        let tmp_txt = std::env::temp_dir().join("wraith_screen.txt");
        
        captured.save(&tmp).map_err(|e| e.to_string())?;
        
        let mut ocr_text = String::new();
        // Try to run Tesseract
        let tesseract_path = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
        if std::path::Path::new(tesseract_path).exists() {
            let _ = std::process::Command::new(tesseract_path)
                .arg(&tmp)
                .arg(&tmp_txt_prefix)
                .output();
                
            if let Ok(text) = std::fs::read_to_string(&tmp_txt) {
                ocr_text = text.trim().to_string();
            }
            let _ = std::fs::remove_file(&tmp_txt);
        }

        let bytes = std::fs::read(&tmp).map_err(|e| e.to_string())?;
        let _ = std::fs::remove_file(&tmp);

        Ok(ScreenCapture {
            base64: format!("data:image/png;base64,{}", general_purpose::STANDARD.encode(&bytes)),
            text: ocr_text,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ─── Open dashboard ───────────────────────────────────────────────────────────
#[tauri::command]
pub async fn open_dashboard(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("dashboard") {
        let _ = w.show();
        let _ = w.set_focus();
    } else {
        let _ = tauri::WebviewWindowBuilder::new(
            &app,
            "dashboard",
            tauri::WebviewUrl::App("dashboard.html".into()),
        )
        .title("Wraith — Dashboard")
        .inner_size(800.0, 600.0)
        .min_inner_size(700.0, 500.0)
        .build();
    }
}

// ─── Clipboard ────────────────────────────────────────────────────────────────
#[tauri::command]
pub async fn get_clipboard(app: tauri::AppHandle) -> Result<String, String> {
    app.clipboard().read_text().map_err(|e| e.to_string())
}
