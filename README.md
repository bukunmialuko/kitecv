# Kite

Write your CV in Markdown. Download a real PDF.

Not an image of a page — a PDF with **selectable text, live links and embedded
fonts**, so the ATS that screens it can actually read it.

```
markdown  →  page-by-page preview  →  PDF
```

## Why

Most markdown-CV tools stop at the browser's print dialog, or screenshot the page
into a bitmap. A bitmap CV looks fine to you and is empty to every automated
parser it meets. Kite renders through headless Chrome instead, so the file you
download is the file you previewed — down to the page breaks.

- **Page-exact preview.** Paginated with [Paged.js](https://pagedjs.org), at a
  fixed A4 width that scales to your pane instead of reflowing. Where a line
  breaks in the preview is where it breaks in the PDF.
- **Analysis.** Employment gaps, reversed dates, entries out of order, missing
  sections — checked as you type.
- **No account.** Editing, preview and analysis run in your browser. The CV is
  sent to the server only when you press Download, rendered in memory, and never
  stored.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build
```

PDF export needs the serverless function, so run `vercel dev` instead of
`npm run dev` if you want to exercise Download locally. Everything else works
without it.

## The format

Full contract in [CV-FORMAT.md](CV-FORMAT.md). The whole of it:

```markdown
# Jordan Avery
Software Engineer
Bristol, UK | +44 7700 900123
jordan@example.com
github.com/jordanavery

## Summary
One paragraph.

## Skills
Languages: Python, Go, TypeScript

## Experience
### [Northwind](https://northwind.example) | March 2023 – Present
Senior Engineer | Remote
- Cut checkout p95 latency from 840ms to 310ms by adding read replicas.
Tech: Go, PostgreSQL, Redis

## Education
### Northgate University | 2022
M.Sc. Computer Science
```

One grammar for every entry: `###` is the bold row, the next plain line is the
sub-row, `-` are bullets, `Tech:` becomes chips. Section order follows your
markdown, so moving a section is an edit, not a setting.

## Layout

```
src/core/          parse · report · render — no React, no DOM
src/components/    the React shell
api/pdf.ts         headless Chrome: HTML in, PDF out
```

`core/` is deliberately framework-free so it can be lifted into a VS Code
extension later. `assets.ts` is the only file that knows about the bundler.

## Credits

Typeset in [Inter](https://rsms.me/inter/) (SIL OFL, bundled). The renderer began
life as a Python tool in
[skill-bridge](https://github.com/bukunmialuko/skill-bridge); the test suite pins
this port to that verified output.
