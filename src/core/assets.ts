/**
 * Bundler-aware module: the eager half.
 *
 * `?raw` and `?inline` are Vite features. Confining them to `assets*.ts` keeps
 * everything else in `core/` portable — a VS Code extension or a Node script
 * replaces these files (reading from disk instead) and the rest works unchanged.
 *
 * Everything here lands in the main chunk, so only the default template's
 * assets belong in this file. Plex lives in `assets.plex.ts`, which is reached
 * through a dynamic `import()` and therefore ships as its own chunk.
 *
 * See CLAUDE.md → Invariants.
 */
import interDataUri from "./fonts/Inter-Variable.woff2?inline";
import sampleRaw from "./sample.md?raw";
import classicCssRaw from "./templates/classic.css?raw";

/**
 * NOTE: Vite stubs CSS modules to an empty string under SSR/node, so this is
 * `""` inside vitest's node environment. That is a test-environment artifact,
 * not a build problem — the browser bundle carries the real stylesheet. Nothing
 * in the test suite depends on its contents, and `main.tsx` asserts it is
 * non-empty at startup so a genuinely broken build fails loudly instead of
 * silently rendering an unstyled CV.
 */
export const classicCss: string = classicCssRaw;

/**
 * A base64 `data:` URI for the Inter variable font.
 *
 * The font is embedded rather than linked so the exported CV renders identically
 * on a machine that has never heard of Inter, offline, and in the PDF. Inter is
 * a genuine variable font, so this one file covers the whole 100-900 range.
 */
export const interFontDataUri: string = interDataUri;

export const sampleMarkdown: string = sampleRaw;
