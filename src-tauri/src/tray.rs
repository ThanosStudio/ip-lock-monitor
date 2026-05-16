use tauri::{App, AppHandle, Emitter, Manager};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_positioner::{Position, WindowExt};

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_item = MenuItem::with_id(app, "toggle_monitor", "▶ 开始监控", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle_item, &quit_item])?;

    TrayIconBuilder::with_id("main")
        .icon(Image::from_bytes(include_bytes!("../icons/tray-gray.png"))?)
        .menu(&menu)
        .tooltip("IP 监控")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            // Must call this first so positioner knows the tray's current screen position
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                toggle_main_window(app);
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "toggle_monitor" => {
                let _ = app.emit("tray-toggle-monitor", ());
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.move_window(Position::TrayCenter);
            let _ = window.set_always_on_top(true);
            let _ = window.show();
        }
    }
}

#[tauri::command]
pub fn update_tray_icon(app: AppHandle, status: String) -> Result<(), String> {
    let icon_bytes: &[u8] = match status.as_str() {
        "green" => include_bytes!("../icons/tray-green.png"),
        "red" => include_bytes!("../icons/tray-red.png"),
        _ => include_bytes!("../icons/tray-gray.png"),
    };
    if let Some(tray) = app.tray_by_id("main") {
        let icon = Image::from_bytes(icon_bytes).map_err(|e| e.to_string())?;
        tray.set_icon(Some(icon)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn update_tray_menu(app: AppHandle, is_monitoring: bool) -> Result<(), String> {
    let label = if is_monitoring { "⏹ 停止监控" } else { "▶ 开始监控" };
    if let Some(tray) = app.tray_by_id("main") {
        let toggle_item =
            MenuItem::with_id(&app, "toggle_monitor", label, true, None::<&str>)
                .map_err(|e| e.to_string())?;
        let quit_item =
            MenuItem::with_id(&app, "quit", "退出程序", true, None::<&str>)
                .map_err(|e| e.to_string())?;
        let menu = Menu::with_items(&app, &[&toggle_item, &quit_item])
            .map_err(|e| e.to_string())?;
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
