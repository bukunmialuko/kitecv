/**
 * The scannable code printed beside the contact block.
 *
 * A QR code rather than a linear barcode, deliberately: it is the only kind a
 * phone camera opens as a link, and a Code 128 strip carrying a 30-character URL
 * needs ~380 modules — about 9cm of page before a phone can resolve the bars. A
 * QR code carries the same URL legibly in under 2cm.
 *
 * Drawn as one SVG path in `currentColor`, so it is vector in the PDF, inherits
 * the paper's ink, and adds no font, image or external reference to the
 * document.
 */
import { encode } from "uqr";
import type { ContactItem, ContactKind, Cv } from "./types";

/** The contact kinds that are links a reader would want to open. */
const LINK_KINDS: ContactKind[] = ["link", "linkedin", "github"];

/**
 * A personal site is the most deliberate link a person lists, so it wins; then
 * LinkedIn, which is where a recruiter goes next; then GitHub.
 */
const PRIORITY: Record<string, number> = { link: 0, linkedin: 1, github: 2 };

/** The choice the shell stores: no code, the best link, or one link by URL. */
export type CodeChoice = "off" | "auto" | (string & {});

export interface CodeLink {
  kind: ContactKind;
  href: string;
  /** Short, for a picker: "LinkedIn", "GitHub", or the site's host. */
  label: string;
}

function labelFor(item: ContactItem): string {
  if (item.kind === "linkedin") return "LinkedIn";
  if (item.kind === "github") return "GitHub";
  return item.text.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] || item.text;
}

/** Every header link a code could carry, best first, each URL once. */
export function codeLinks(cv: Cv): CodeLink[] {
  const seen = new Set<string>();
  const links: CodeLink[] = [];
  for (const item of cv.contact.rows.flat()) {
    if (!LINK_KINDS.includes(item.kind) || !item.href || seen.has(item.href)) continue;
    seen.add(item.href);
    links.push({ kind: item.kind, href: item.href, label: labelFor(item) });
  }
  // Array.prototype.sort is stable, so two sites keep the order they were written in.
  return links.sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]);
}

/**
 * Resolve a stored choice against the CV as it is now. A URL that has since
 * been edited out falls back to the best remaining link rather than to nothing:
 * the person asked for a code, and fixing a typo in their LinkedIn handle should
 * not silently take it off the page.
 */
export function resolveCodeLink(cv: Cv, choice: CodeChoice): CodeLink | null {
  if (choice === "off") return null;
  const links = codeLinks(cv);
  return links.find((link) => link.href === choice) ?? links[0] ?? null;
}

/**
 * Encode `text` as an SVG QR code with no quiet zone — the stylesheet supplies
 * that as padding, so it can be a white tile on dark paper and plain margin on
 * light.
 *
 * Error correction M (15%): enough to survive a crease or a smudge on a printed
 * page, while keeping a typical profile URL at version 3 (29 modules), so each
 * module stays large enough to resolve at the size the header prints it.
 *
 * Each row is emitted as horizontal runs rather than one square per module,
 * which keeps the path to a few hundred bytes.
 */
export function qrSvg(text: string): string {
  const { size, data } = encode(text, { ecc: "M", border: 0 });
  let d = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y][x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && data[y][x]) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return (
    `<svg class="qr-code" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" ` +
    `aria-hidden="true"><path d="${d}"/></svg>`
  );
}
