// `vitest/config` rather than `vite` — it is the same defineConfig widened to
// accept the `test` block, so no separate vitest.config file is needed.
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Serve `api/pdf.ts` from the dev server, so Download works under plain
 * `npm run dev` instead of only under `vercel dev`.
 *
 * It runs the real handler — loaded through Vite's SSR loader, so edits to it
 * apply on the next request — behind the two Vercel helpers it uses
 * (`req.body`, `res.status().send()`). Off the deploy path entirely: `apply:
 * "serve"` keeps it out of the build, and production is Vercel's own function.
 * Locally the handler drives the installed Chrome, so that is what it needs.
 */
function devPdf(): Plugin {
  return {
    name: "kite:dev-pdf",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/pdf", async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        let body: unknown;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          body = undefined;
        }

        const vercelRes = Object.assign(res, {
          status(code: number) {
            res.statusCode = code;
            return vercelRes;
          },
          send(payload: string | Buffer) {
            res.end(payload);
            return vercelRes;
          },
        });

        try {
          const { default: handler } = await server.ssrLoadModule("/api/pdf.ts");
          await handler(Object.assign(req, { body }), vercelRes);
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : "PDF generation failed");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devPdf()],
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
