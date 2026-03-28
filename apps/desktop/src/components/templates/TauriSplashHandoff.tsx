import { useLayoutEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

/**
 * After the main webview has committed layout, close the splash and show the main window.
 * Do not use requestAnimationFrame here: the main window starts hidden (`visible: false`), and
 * hidden documents throttle rAF heavily so the handoff may never run. See
 * https://v2.tauri.app/learn/splashscreen/
 */
export function TauriSplashHandoff() {
  useLayoutEffect(() => {
    if (!isTauri()) return;

    void invoke("splash_screen_finish").catch(() => {
      /* splash may already be gone or not running under Tauri */
    });
  }, []);

  return null;
}
