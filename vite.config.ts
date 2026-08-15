// `vitest/config` rather than `vite` — it is the same defineConfig widened to
// accept the `test` block, so no separate vitest.config file is needed.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The CV font is base64-inlined into the exported document, so it must never
  // be emitted as a separate asset. `?inline` handles that per-import; this
  // keeps everything else honest.
  build: { assetsInlineLimit: 4096 },
  test: {
    // core/ is pure string and object work — no DOM needed, so tests stay fast
    // and jsdom stays out of the dependency list.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
