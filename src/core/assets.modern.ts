/**
 * Bundler-aware module: the Modern template's lazy half.
 *
 * Same contract as `assets.plex.ts`: reached only through the dynamic
 * `import()` in `templates/index.ts`, so its font ships as its own chunk and a
 * visitor who never picks Modern never downloads it.
 *
 * Nothing may import this file statically — one static import anywhere in the
 * eager graph folds the chunk back into the main bundle, and the only symptom
 * is the build's size report.
 */
import geistDataUri from "./fonts/Geist-Variable.woff2?inline";
import modernCssRaw from "./templates/modern.css?raw";

export const modernCss: string = modernCssRaw;

/** Geist, Latin subset, weight axis (100-900). Upright only — never italic. */
export const geistFontDataUri: string = geistDataUri;
