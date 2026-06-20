import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ToastHost } from "./shared/components/ToastHost";
import "./shared/styles/tokens.css";
import "./shared/styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <ToastHost />
  </React.StrictMode>
);
