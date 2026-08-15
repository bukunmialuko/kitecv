import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { classicCss } from "./core/assets";
import "./app.css";

// An empty template stylesheet renders a structurally correct but completely
// unstyled CV — and it would look like a design bug rather than a build one.
// Vite has changed how `?raw` treats CSS before, so this fails loudly instead.
if (!classicCss.includes("--font-sans")) {
  throw new Error(
    "Template CSS failed to load: src/core/templates/classic.css imported empty. " +
      "Check the `?raw` import in src/core/assets.ts against the current Vite version.",
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
