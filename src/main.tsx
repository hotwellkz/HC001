import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/styles/theme.css";
import "@/styles/ui-primitives.css";

import { bootstrapThemeFromStorage } from "@/store/useUiThemeStore";

import App from "./app/App";

bootstrapThemeFromStorage();

const el = document.getElementById("root");
if (!el) {
  throw new Error("root element not found");
}

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
