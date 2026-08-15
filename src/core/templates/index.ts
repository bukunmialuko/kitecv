/**
 * Template registry.
 *
 * A template is a stylesheet plus the fonts that stylesheet needs. `renderBody`
 * emits semantic classes (`.entry-head .left`, `.chip`, `.section-title`) that
 * every template styles differently — the renderer never changes when one is
 * added.
 *
 * Fonts belong to the template, not to the document: each family costs 50-150KB
 * inlined, so a shared block would make every Classic export carry Plex's four
 * faces for nothing.
 *
 * **Loading is asymmetric, deliberately.** Classic is the default, so it is
 * needed for the first paint and is imported eagerly. Every other template is
 * fetched by `loadTemplate()` through a dynamic `import()`, which is what keeps
 * its fonts out of the main bundle. Adding a template means adding a `case`
 * there and a row in `templateMeta` — never a static import.
 */
import { classicCss, interFontDataUri } from "../assets";
import type { Template } from "../types";

/**
 * One `@font-face` rule. `font-display: block` rather than `swap` because a
 * swap would let the PDF snapshot render in a fallback face — the export is a
 * one-shot screenshot, not a page a reader waits on.
 */
function face(family: string, weight: string, dataUri: string): string {
  return [
    "@font-face {",
    `  font-family: '${family}';`,
    "  font-style: normal;",
    `  font-weight: ${weight};`,
    "  font-display: block;",
    `  src: url(${dataUri}) format('woff2');`,
    "}",
  ].join("\n");
}

export const DEFAULT_TEMPLATE_ID = "classic";

const classic: Template = {
  id: "classic",
  name: "Classic",
  css: classicCss,
  fontCss: face("Inter", "100 900", interFontDataUri),
};

/** Id and name only — enough to build the picker without pulling in any font. */
export const templateMeta: Array<{ id: string; name: string }> = [
  { id: "classic", name: "Classic" },
  { id: "plex", name: "Plex" },
];

/**
 * The synchronous default, for callers that need a template immediately —
 * `renderDocument` when none was passed, and the first paint before
 * `loadTemplate` resolves.
 */
export function defaultTemplate(): Template {
  return classic;
}

/**
 * Resolve a template by id, fetching its chunk if it is not the default.
 * Falls back to Classic for an unknown id, so a stale `templateId` in
 * localStorage degrades to the default instead of rendering nothing.
 */
export async function loadTemplate(id: string | undefined): Promise<Template> {
  if (id === "plex") {
    const plex = await import("../assets.plex");
    return {
      id: "plex",
      name: "Plex",
      css: plex.plexCss,
      fontCss: [
        face("Archivo", "100 900", plex.archivoFontDataUri),
        face("IBM Plex Sans", "100 700", plex.plexSansFontDataUri),
        face("IBM Plex Mono", "400", plex.plexMono400FontDataUri),
        face("IBM Plex Mono", "500", plex.plexMono500FontDataUri),
      ].join("\n"),
    };
  }
  return classic;
}
