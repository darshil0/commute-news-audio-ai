/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file src/main.tsx
 * @description Application client entry point for CommuteBrief.
 *
 * Bootstraps the React 19 application tree onto the DOM `#root` container
 * within React {@link StrictMode}. Global styles, typography fonts, Tailwind CSS
 * directives, and CSS custom variables are imported via `index.css`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
