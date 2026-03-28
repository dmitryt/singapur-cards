use tauri::Manager;

/// Called from the main webview after the React shell has painted; closes the native splash window
/// and shows the main window (see https://v2.tauri.app/learn/splashscreen/).
#[tauri::command]
pub fn splash_screen_finish(app: tauri::AppHandle) -> Result<(), String> {
    let splash = app
        .get_webview_window("splashscreen")
        .ok_or_else(|| "splash webview not found".to_string())?;
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "main webview not found".to_string())?;

    splash.close().map_err(|e| e.to_string())?;
    main.show().map_err(|e| e.to_string())?;
    let _ = main.set_focus();

    Ok(())
}
