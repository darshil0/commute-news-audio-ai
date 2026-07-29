/**
 * @file vite.config.ts
 * @description Vite build configuration for CommuteBrief.
 *
 * Plugins:
 * - `@vitejs/plugin-react` — React Fast Refresh + JSX transform.
 * - `@tailwindcss/vite` — Tailwind CSS v4 Vite integration.
 *
 * Aliases:
 * - `@` resolves to the project root, enabling absolute-style imports
 *   (e.g. `@/src/lib/db`).
 *
 * HMR / Watch:
 * - When the `DISABLE_HMR` environment variable is `"true"` (set by AI Studio
 *   to avoid flicker during agent-driven file edits), both HMR and Vite's
 *   file-watcher are disabled.
 */

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
