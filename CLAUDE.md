# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Kite** — a markdown CV editor. Markdown in, a real PDF out: selectable text,
live links, embedded fonts, true pagination. Deployed on Vercel.

- `src/core/` — parse, report, render. **Framework-free**: no React, no DOM.
- `src/components/` — the React shell.
- `api/pdf.ts` — serverless headless Chrome, HTML in, PDF out.

## Commits

- **One-line conventional commits only.** `type(scope): subject` on a single
  line. No body, no footer, no bullet list.
- **Never add `Co-Authored-By`** or any other trailer. Nothing that attributes
  the commit to Claude.
- **Suggest, never apply.** End a response with a proposed commit when there are
  uncommitted changes worth committing. Only run `git commit` when explicitly
  told to.
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `build`, `perf`.
- Subject in imperative mood, lowercase, no trailing period.

**Good:**

```
feat(preview): scale the page to fit the pane
fix(parse): keep indented bullet continuations
docs: document the markdown contract
```

**Not allowed:** multi-line messages, bodies, or any `Co-Authored-By` /
generated-with trailer.

## Invariants

These are load-bearing. Breaking one silently degrades the output.

- **`src/core/` imports no React and touches no DOM.** It is the future VS Code
  package. `assets.ts` is the only file allowed to know about Vite (`?raw`,
  `?inline`).
- **Tailwind stops at the iframe.** The shell uses Tailwind; the CV document uses
  plain CSS in `core/templates/*.css`. The CV must render standalone in the
  iframe, on the server and in the saved PDF — none of which can reach the app's
  compiled stylesheet.
- **The preview page never reflows.** It is fixed at 794px (A4) and scaled with a
  CSS transform to fit the pane. If line breaks change when the pane resizes, the
  preview is lying about the PDF.
- **`page.pdf()` keeps `preferCSSPageSize: true`.** Without it Chrome ignores
  `@page { size: A4 }` and emits Letter. Check the PDF MediaBox: A4 is 595x842pt.
- **Backgrounds need `print-color-adjust: exact` in the template CSS *or*
  `printBackground: true` in `page.pdf()`.** Measured: either alone is enough,
  and only dropping both loses the chip fills. Both are kept, so a template that
  forgets the CSS side still exports correctly.
- **`buildReport(cv, extra?, today?)` keeps `today` injectable.** `Present`
  resolves against it, so tests rot without it.
- **The CV document stays black-on-white in both themes.** It is a printed page.
- **Preview furniture stays out of `renderDocument()`.** The dot grid, sheet
  borders and page numbers are injected into the iframe only — in the document
  they would print.
- The logic was ported from `skill-bridge/tool-01-cv-renderer`, and
  `render.test.ts` pins it to that verified output via
  `__fixtures__/sample.body.html`. Regenerate the fixture only when a rendering
  change is intentional.

## Style

- Shell: greyscale, `radius: 0`, no `box-shadow`, hairline and dashed borders,
  dot-grid ground, huge tight-tracked headings, system monospace for metadata.
- The only non-greyscale colour is Analysis severity (error / warning / info).
- Avoid: gradients, glass, sparkles, rounded corners, stock illustration,
  dashboard chrome.

## Checks

```bash
npm test          # vitest — core suites plus the fixture test
npm run build     # tsc --noEmit && vite build; must pass before proposing a commit
```
