use tauri::{
    App, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

mod commands;
mod context;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::set_settings,
            commands::get_threads,
            commands::save_thread,
            commands::delete_thread,
            commands::get_playbooks,
            commands::save_playbook,
            commands::delete_playbook,
            commands::capture_screen,
            commands::open_dashboard,
            commands::get_clipboard,
            context::get_active_app,
        ])
        .setup(|app| {
            setup_windows(app)?;
            setup_tray(app)?;
            setup_hotkeys(app)?;
            context::start_polling(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running wraith");
}

fn setup_windows(app: &mut App) -> anyhow::Result<()> {
    // Overlay window is auto-created via tauri.conf.json
    // We just need to hide it from screen capture on Windows
    if let Some(overlay) = app.get_webview_window("overlay") {
        #[cfg(target_os = "windows")]
        overlay.set_content_protected(true)?;
    }

    Ok(())
}

fn setup_tray(app: &mut App) -> anyhow::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "Toggle Overlay", true, None::<&str>)?;
    let dashboard = MenuItem::with_id(app, "dashboard", "Open Dashboard", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit WRAITH", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&toggle, &dashboard, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => {
                if let Some(w) = app.get_webview_window("overlay") {
                    let _ = if w.is_visible().unwrap_or(false) {
                        w.hide()
                    } else {
                        w.show()
                    };
                }
            }
            "dashboard" => {
                open_or_create_dashboard(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn setup_hotkeys(app: &mut App) -> anyhow::Result<()> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    let app_handle = app.handle().clone();
    app.global_shortcut().on_shortcut("CmdOrCtrl+Backslash", move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(w) = app_handle.get_webview_window("overlay") {
                let visible = w.is_visible().unwrap_or(false);
                let _ = if visible { w.hide() } else { w.show() };
            }
        }
    })?;

    let app_handle2 = app.handle().clone();
    app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+W", move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            open_or_create_dashboard(&app_handle2);
        }
    })?;

    let app_handle3 = app.handle().clone();
    app.global_shortcut().on_shortcut("CmdOrCtrl+Enter", move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(w) = app_handle3.get_webview_window("overlay") {
                let _ = w.show();
                let _ = w.emit("wraith://ask", serde_json::json!({ "query": "", "includeScreenshot": false }));
            }
        }
    })?;

    let app_handle4 = app.handle().clone();
    app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+Enter", move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(w) = app_handle4.get_webview_window("overlay") {
                let _ = w.show();
                let _ = w.emit("wraith://ask", serde_json::json!({ "query": "", "includeScreenshot": true }));
            }
        }
    })?;

    Ok(())
}

fn open_or_create_dashboard(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("dashboard") {
        let _ = w.show();
        let _ = w.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(app, "dashboard", WebviewUrl::App("dashboard.html".into()))
            .title("Wraith — Dashboard")
            .inner_size(800.0, 600.0)
            .min_inner_size(700.0, 500.0)
            .decorations(true)
            .transparent(false)
            .resizable(true)
            .build();
    }
}

