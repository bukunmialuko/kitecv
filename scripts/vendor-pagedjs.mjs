/**
 * Copy Paged.js's polyfill build into `public/`.
 *
 * The package exposes it only under a non-standard `"polyfill"` export
 * condition, so no bundler can resolve `pagedjs/dist/paged.polyfill.js`. The
 * preview also needs it as a plain <script> served to the iframe rather than as
 * a bundled module, so copying it is the honest fix rather than a workaround.
 *
 * Runs from `predev` and `prebuild`, so it always matches the installed version.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "pagedjs", "dist", "paged.polyfill.js");
const target = join(root, "public", "paged.polyfill.js");

if (!existsSync(source)) {
  console.error(`[vendor-pagedjs] not found: ${source}\nRun npm install first.`);
  process.exit(1);
}

mkdirSync(join(root, "public"), { recursive: true });
copyFileSync(source, target);
console.log("[vendor-pagedjs] public/paged.polyfill.js");
