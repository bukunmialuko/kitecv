# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Kite** — a markdown CV editor. Markdown in, a real PDF out: selectable text,
live links, embedded fonts, true pagination. Deployed on Vercel.

- `src/core/` — parse, format, report, render. **Framework-free**: no React,
  no DOM.
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
  package. Only the `assets*.ts` files may know about Vite (`?raw`, `?inline`):
  `assets.ts`, plus one lazy `assets.<template>.ts` per non-default template
  (`assets.plex.ts`, `assets.modern.ts`).
- **Tailwind stops at the iframe.** The shell uses Tailwind; the CV document uses
  plain CSS in `core/templates/*.css`. The CV must render standalone in the
  iframe, on the server and in the saved PDF — none of which can reach the app's
  compiled stylesheet.
- **Fonts belong to the template, not the document.** `Template.fontCss` carries
  the `@font-face` block and `renderDocument` emits only the active template's.
  Each family costs 50-150KB base64-inlined, so hoisting them into one shared
  block would put Plex's four faces into every Classic export. `render.test.ts`
  pins the per-template face counts.
- **A template only asks for weights its files actually contain.** Archivo, Inter,
  IBM Plex Sans and Geist ship here as variable fonts, so any weight in
  range is a real instance. Only upright faces are embedded: no template may ask
  for italic, or the browser slants the roman. IBM Plex Mono has no variable build — only 400 and 500 are embedded,
  and asking for 600 would get a synthesised approximation instead.
- **Only the default template is imported eagerly.** Every other one is fetched
  by `loadTemplate()` through a dynamic `import()`, which is the only reason its
  fonts stay out of the main bundle — base64 font data barely compresses, so
  Plex alone is ~116KB gzipped. A single static `import … from "./assets.plex"`
  (or `./assets.modern`)
  anywhere in the eager graph silently folds that chunk back into the main
  bundle, and the only symptom is the build's size report. Check it after
  touching `core/templates/index.ts` or either `assets*.ts`.
- **The preview page never reflows.** It is fixed at 794px (A4) and scaled with a
  CSS transform to fit the pane. If line breaks change when the pane resizes, the
  preview is lying about the PDF.
- **`page.pdf()` keeps `preferCSSPageSize: true`.** Without it Chrome ignores
  `@page { size: A4 }` and emits Letter. Check the PDF MediaBox: A4 is 595x842pt.
- **Backgrounds need `print-color-adjust: exact` in the template CSS *or*
  `printBackground: true` in `page.pdf()`.** Measured: either alone is enough,
  and only dropping both loses the chip fills. Both are kept, so a template that
  forgets the CSS side still exports correctly.
- **Formatting is parse-preserving and idempotent.** `formatMarkdown` rewrites
  the author's source, and the editor runs it unprompted two seconds after the
  typing stops, so a rule that loses something loses it on every CV. Reparsing
  formatted markdown must give back the same `Cv` — the single exception is the
  date dash, and `format.test.ts` states it through `formatColumn` itself rather
  than restating it. Blank-line counts and `---` are meaning, not whitespace:
  the formatter re-emits them, and prose sections are printed verbatim so it
  does not touch them at all. It reads its grammar from `parse.ts`'s exports;
  a second definition of what a bullet looks like would drift.
- **`buildReport(cv, extra?, today?)` keeps `today` injectable.** `Present`
  resolves against it, so tests rot without it.
- **Every template shares one spacing scale** — 2/4/8/14/24pt, one step per
  level (contact rows / bullets / rule-to-content / entries / sections), so a
  new job always reads as a new group. Templates differ in typography, never in
  rhythm.
- **Readability floors, on both papers:** every text role at least 4.5:1
  against its ground (small text below that is deciphered, not read), nothing
  under 7.6pt, and body text matched across templates by x-height (5.2pt), not
  point size — so switching template never makes the CV look smaller. Bullet markers are centred on the
  x-height by *measurement in Chrome*, not derived from font metrics (which put
  Plex 0.8pt off); re-measure after changing a template's leading or body size.
- **`***text***` is a highlight, not bold-italic.** It renders as `<mark>`,
  which every template must style (`--accent`, plus `--accent-glow` on black
  paper) — an unstyled `<mark>` gets the browser's yellow background. Colour,
  weight and glow only, so a highlight never moves a line.
- **The CV's colours follow its paper, never the app theme.** White paper or
  black (`#222222`, white ink) is a document setting, like the template; the
  shell's light/dark toggle never reaches the iframe. Paper swaps colour tokens
  only — never a size, weight or gap — so a CV paginates identically on both,
  and `render.test.ts` pins the body as byte-identical across papers.
- **Black paper needs `@page { background }`.** Measured: a root background
  alone stops at the page margin and leaves a white frame round every PDF
  sheet. `pageCss()` emits it, because `@page` cannot read a custom property;
  templates own only the ink, under `:root[data-paper="dark"]`.
- **Entries are allowed to span pages.** `break-inside: avoid` on `.entry` was
  removed: it pushed tall roles whole and left dead space behind them. The narrow
  rules that replaced it (header `break-after: avoid`, `li break-inside: avoid`,
  `.chips break-before: avoid`) must stay, or splits land in ugly places.
- **`break-after: avoid` and `break-before: avoid` are NO-OPS in Paged.js.** Its
  `needsPreviousBreakAfter` only tests the forcing values, never `avoid`. Chrome
  honours them, so the PDF is correct while the preview can show a section
  heading stranded at a page foot. `break-inside: avoid` is the only primitive
  both engines implement. Do not "fix" the CSS on the assumption it is honoured.
- **Guide snippets are executable documentation.** `src/guide/topics.ts` is
  parsed by `guide.test.ts`, which asserts each snippet still produces what its
  prose claims. Change the format and the docs fail with it, by design.
- **Preview furniture stays out of `renderDocument()`.** The panel ground, sheet
  borders and page numbers are injected into the iframe only — in the document
  they would print. That ground is deliberately flat: the iframe is
  transform-scaled to fit the pane, so any background pattern scales with it and
  no longer lines up with the shell's own.
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

The Download button returns a **zip** of the PDF plus the markdown that produced
it (`src/core/bundle.ts`), zipped client-side so `api/pdf.ts` stays HTML-in,
PDF-out.

```bash
npm test          # vitest — core suites, the fixture test, and the guide check
npm run build     # tsc --noEmit && vite build; must pass before proposing a commit
```

`npm run dev` also serves `/api/pdf` (a dev-only plugin in `vite.config.ts`
that runs the real handler against the installed Chrome), so Download works
locally without `vercel dev`.
