use active_win_pos_rs::get_active_window;
use serde::Serialize;
use tauri::Emitter;

#[derive(Serialize)]
pub struct ActiveApp {
    pub app_name: String,
    pub title: String,
}

#[tauri::command]
pub async fn get_active_app() -> Result<ActiveApp, String> {
    tokio::task::spawn_blocking(|| {
        match get_active_window() {
            Ok(window) => Ok(ActiveApp {
                app_name: window.app_name,
                title: window.title,
            }),
            Err(()) => Err("Failed to get active window".to_string()),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn start_polling(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut last_app = String::new();
        loop {
            if let Ok(window) = get_active_window() {
                // Skip Wraith itself and DevTools windows — we never want to reset mode for these
                if window.app_name == "Wraith" || window.app_name.contains("WebView2") {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    continue;
                }
                if window.app_name != last_app {
                    last_app = window.app_name.clone();
                    let payload = ActiveApp {
                        app_name: window.app_name.clone(),
                        title: window.title.clone(),
                    };
                    println!("DEBUG ACTIVE APP: exe='{}', title='{}'", window.app_name, window.title);
                    let _ = app.emit("wraith://active-app", &payload);
                }
            }
            std::thread::sleep(std::time::Duration::from_secs(2));
        }
    });
}
