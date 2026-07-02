import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ToastHost } from "./shared/components/ToastHost";
import { applyLocale, readStoredLocale } from "./shared/i18n/localeStore";
import { applySidebarWidth, readSidebarWidth } from "./shared/lib/sidebarState";
import "./shared/styles/tokens.css";
import "./shared/styles/global.css";
import "./shared/styles/mobile.css";

applySidebarWidth(readSidebarWidth());
applyLocale(readStoredLocale());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <ToastHost />
  </React.StrictMode>
);
