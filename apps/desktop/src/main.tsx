import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import "./index.css";
import "fomantic-ui-css/semantic.min.css";
import App from "./App";
import { TauriSplashHandoff } from "./components/templates/TauriSplashHandoff";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <>
      <App />
      {isTauri() && <TauriSplashHandoff />}
    </>
  </React.StrictMode>
);
