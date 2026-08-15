/**
 * Package a rendered CV with the markdown that produced it.
 *
 * Shipping the source next to the PDF means the file you archive is one you can
 * edit again, rather than a dead end.
 *
 * Pure — no DOM — so it is testable in Node and reusable outside the browser.
 */
import { zipSync, strToU8 } from "fflate";

/** Turn a person's name into a filename that survives every filesystem. */
export function slugify(name: string): string {
  const slug = (name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "cv";
}

export interface Bundle {
  filename: string;
  /**
   * Pinned to `ArrayBuffer` rather than the default `ArrayBufferLike`: since
   * TS 5.7 a plain `Uint8Array` may be backed by a `SharedArrayBuffer` and so no
   * longer satisfies `BlobPart`. fflate always allocates a normal ArrayBuffer,
   * so narrowing it here keeps the assertion in one place instead of at every
   * call site.
   */
  bytes: Uint8Array<ArrayBuffer>;
}

/**
 * Build the zip. Stored, not deflated: a PDF is already compressed and the
 * markdown is a few kilobytes, so compressing buys nothing and costs time.
 */
export function buildBundle(options: {
  name: string;
  markdown: string;
  pdf: Uint8Array;
}): Bundle {
  const slug = slugify(options.name);
  const bytes = zipSync(
    {
      [`${slug}.pdf`]: options.pdf,
      [`${slug}.md`]: strToU8(options.markdown),
    },
    { level: 0 },
  );
  return { filename: `${slug}-cv.zip`, bytes: bytes as Uint8Array<ArrayBuffer> };
}
