/**
 * Bundler-aware module: the lazy half.
 *
 * Split out from `assets.ts` purely for bundle size. Base64 font data barely
 * compresses, so these four faces cost ~114KB gzipped — more than the rest of
 * the app put together. Reaching them only through the dynamic `import()` in
 * `templates/index.ts` keeps them in their own chunk, so a visitor who never
 * leaves the default template never downloads them.
 *
 * Nothing may import this file statically. One `import ... from "./assets.plex"`
 * anywhere in the eager graph silently folds the chunk back into the main
 * bundle, and the only symptom is the bundle report.
 */
import archivoDataUri from "./fonts/Archivo-Variable.woff2?inline";
import plexMono400DataUri from "./fonts/IBMPlexMono-400.woff2?inline";
import plexMono500DataUri from "./fonts/IBMPlexMono-500.woff2?inline";
import plexSansDataUri from "./fonts/IBMPlexSans-Variable.woff2?inline";
import plexCssRaw from "./templates/plex.css?raw";

export const plexCss: string = plexCssRaw;

/**
 * Archivo and IBM Plex Sans are genuine variable fonts, so one file each covers
 * every weight the stylesheet asks for. IBM Plex Mono ships no variable build,
 * so its two weights are two files — and the template must never ask for a
 * third, or the browser will synthesise it.
 */
export const archivoFontDataUri: string = archivoDataUri;
export const plexSansFontDataUri: string = plexSansDataUri;
export const plexMono400FontDataUri: string = plexMono400DataUri;
export const plexMono500FontDataUri: string = plexMono500DataUri;
