# Kite

Write your CV in Markdown. Download a real PDF.

**[kitecv.vercel.app](https://kitecv.vercel.app/)** — no install, no account.

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
- **Formatting.** Press Format and the source is rewritten in canonical shape:
  spaced pipes, `- ` bullets, en-dashed date ranges, one blank line where one
  belongs. Leave Auto on and it runs itself two seconds after you stop typing.
  It cannot change what your CV says — the blank lines that mean a spacing step
  and the `---` that means a page break are counted, not collapsed, and prose is
  left exactly as you typed it.
- **No account.** Editing, preview and analysis run in your browser. The CV is
  sent to the server only when you press Download, rendered in memory, and never
  stored.
- **Download gives you both.** A zip containing the PDF and the markdown that
  produced it, so the file you archive is one you can edit again.
- **A guide built in.** The Guide tab documents the whole format beside your
  editor. Every example in it is checked by the test suite.
- **Three typefaces.** Pick Classic, Plex or Modern above the preview — each
  name is set in its own kind of type — and the preview, the PDF and the saved
  file all follow. Your markdown never changes; templates differ by stylesheet
  and typeface only.
- **White or black paper.** Black is `#222222` with white ink, painted to the
  edge of every PDF page rather than stopping at the margin. Paper changes
  colour only, so a CV breaks across pages identically on either.
- **Scan to open.** A QR code of the best link in your header — your site, then
  LinkedIn, then GitHub, or whichever you pick — closing the CV in a small card
  with the address it opens printed beside it.
  Clickable in the PDF; on black paper it sits on a white tile so every phone
  camera reads it. The test suite decodes it to prove it scans.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build
```

`npm run dev` serves the PDF function too, driving your installed Chrome, so
Download works locally without `vercel dev`.

Deployed on Vercel; the PDF function runs headless Chromium, so the first request
after an idle period takes a few seconds to cold-start.

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

Long entries flow across pages, splitting between bullets. To control that
yourself: an extra blank line before an entry adds space, and a `---` line pushes
whatever follows onto a new page.

## Templates

| | Typeface | Reads as |
|---|---|---|
| **Classic** | Inter throughout | Dense and neutral — the default |
| **Plex** | Archivo for the name, IBM Plex Sans for text, IBM Plex Mono for dates, headers and labels | Technical, airy |
| **Modern** | Geist throughout — tight-tracked name, sentence-case headings, soft pill tags | A contemporary product page |

Adding one is a `.css` file plus a case in `core/templates/index.ts` — the
renderer emits semantic classes and never changes. Every font is subset and
embedded in the document itself, so an exported CV carries its own typeface and
renders the same anywhere. Only the default template ships in the main bundle;
the rest load when you pick them.

## Layout

```
src/core/          parse · format · report · render — no React, no DOM
src/core/templates/  one stylesheet per template
src/components/    the React shell
api/pdf.ts         headless Chrome: HTML in, PDF out
```

`core/` is deliberately framework-free so it can be lifted into a VS Code
extension later. `assets.ts` and `assets.plex.ts` are the only files that know
about the bundler.

## Credits

Typeset in [Inter](https://rsms.me/inter/), [Archivo](https://omnibus-type.com/fonts/archivo/)
[IBM Plex](https://www.ibm.com/plex/) and
[Geist](https://github.com/vercel/geist-font) — all SIL OFL, all bundled. The
renderer began life as a Python tool in
[skill-bridge](https://github.com/bukunmialuko/skill-bridge); the test suite pins
this port to that verified output.

## License

MIT © 2026 Oluwabukunmi Aluko — see [LICENSE](LICENSE).
