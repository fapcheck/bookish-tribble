import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
<<<<<<< HEAD
import "./index.css";

// DevTools helper: call window.__tauriHealth() in the console
if (import.meta.env.DEV) {
  // dynamic import works in module code
  import("./lib/tauri")
    .then((tauri) => {
      (window as any).__tauriHealth = () => tauri.db_health().then(console.log);
      console.log("Dev helper ready: run window.__tauriHealth() in console");
    })
    .catch((e) => console.error("Failed to install dev helper:", e));
}
=======
import "./index.css"; // <--- Самая важная строчка сейчас
>>>>>>> origin/main

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
<<<<<<< HEAD
  </React.StrictMode>
=======
  </React.StrictMode>,
>>>>>>> origin/main
);