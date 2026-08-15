/**
 * HTML in, PDF out.
 *
 * The client posts a complete self-contained document from `renderDocument()`,
 * so this function knows nothing about templates, fonts or parsing — it cannot
 * drift from the preview, because it does not render anything. That also means
 * `setContent` has nothing to fetch: no font, no stylesheet, no images.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/** Roughly 4x the largest realistic CV, and well inside Vercel's body limit. */
const MAX_HTML_BYTES = 2_000_000;

async function launch() {
  // @sparticuz ships Linux binaries only, so local dev drives the installed
  // Chrome instead.
  if (process.env.VERCEL) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return puppeteer.launch({ channel: "chrome", headless: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Use POST");
  }

  const html = (req.body as { html?: unknown } | undefined)?.html;
  if (typeof html !== "string" || !html.trim()) {
    return res.status(400).send("Expected a JSON body of the form { html: string }");
  }
  if (html.length > MAX_HTML_BYTES) {
    return res.status(413).send("Document too large");
  }

  let browser;
  try {
    browser = await launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdf = await page.pdf({
      // Backgrounds (the chip fills) survive if EITHER this is set or the
      // stylesheet keeps `print-color-adjust: exact`. Measured: only losing both
      // drops the fills. Kept as the belt to the stylesheet's braces, so the CV
      // still exports correctly if a future template forgets the CSS side.
      printBackground: true,
      // Load-bearing on its own: without it Chrome ignores `@page { size: A4 }`
      // and emits Letter. Verified via the PDF MediaBox (595x842 = A4).
      preferCSSPageSize: true,
    });

    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", 'attachment; filename="cv.pdf"');
    // Nothing is stored: the document lives only for this request.
    res.setHeader("cache-control", "no-store");
    return res.status(200).send(Buffer.from(pdf));
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return res.status(500).send(message);
  } finally {
    await browser?.close();
  }
}
