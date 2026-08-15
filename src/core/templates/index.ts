/**
 * Template registry.
 *
 * Templates differ by **CSS only** — `renderBody` emits semantic classes
 * (`.entry-head .left`, `.chip`, `.section-title`) that every template styles
 * differently. Adding one is a new `.css` file plus a line here; the renderer
 * never changes.
 *
 * The CSS string comes from `assets.ts` so this file stays bundler-agnostic.
 */
import { classicCss } from "../assets";
import type { Template } from "../types";

export const templates: Record<string, Template> = {
  classic: {
    id: "classic",
    name: "Classic",
    css: classicCss,
  },
};

export const DEFAULT_TEMPLATE_ID = "classic";

export function getTemplate(id: string | undefined): Template {
  return templates[id ?? DEFAULT_TEMPLATE_ID] ?? templates[DEFAULT_TEMPLATE_ID];
}

export const templateList: Template[] = Object.values(templates);
