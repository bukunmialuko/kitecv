import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { sampleMarkdown } from "./assets";
import { parseCv } from "./parse";
import { codeLinks, qrSvg, resolveCodeLink } from "./qr";

const cv = (markdown: string) => parseCv(markdown).data;

/**
 * Rasterise the SVG exactly as it is drawn — by replaying its path, not by
 * re-encoding the text — and hand the pixels to an independent decoder. This is
 * the test that matters: the code is the one thing on the page a machine has to
 * read, so "it renders" is not enough.
 */
function decode(svg: string): string | null {
  const size = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
  const quiet = 4;
  const scale = 4;
  const px = (size + quiet * 2) * scale;
  const rgba = new Uint8ClampedArray(px * px * 4).fill(255);
  for (const run of svg.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x0, y, width] = [Number(run[1]), Number(run[2]), Number(run[3])];
    for (let x = x0; x < x0 + width; x++) {
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const at = (((y + quiet) * scale + dy) * px + (x + quiet) * scale + dx) * 4;
          rgba[at] = rgba[at + 1] = rgba[at + 2] = 0;
        }
      }
    }
  }
  return jsQR(rgba, px, px)?.data ?? null;
}

describe("qrSvg", () => {
  it.each([
    "https://linkedin.com/in/jordanavery",
    "https://github.com/jordanavery",
    "https://jordan.example/work?from=cv&utm_source=pdf#top",
  ])("draws a code that decodes back to %s", (url) => {
    expect(decode(qrSvg(url))).toBe(url);
  });

  // Version 3 is what keeps each module large enough to scan at header size.
  it("keeps a typical profile URL at 29 modules", () => {
    expect(qrSvg("https://linkedin.com/in/jordanavery")).toContain('viewBox="0 0 29 29"');
  });

  it("is one self-contained path that takes the paper's ink", () => {
    const svg = qrSvg("https://x.example");
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).not.toMatch(/fill="#|href=|src=/);
  });
});

describe("codeLinks", () => {
  it("finds the sample's LinkedIn and GitHub, LinkedIn first", () => {
    expect(codeLinks(cv(sampleMarkdown)).map((link) => link.label)).toEqual(["LinkedIn", "GitHub"]);
  });

  it("ranks a personal site above LinkedIn and GitHub, labelled by its host", () => {
    const links = codeLinks(cv("# A\nEngineer\ngithub.com/a | linkedin.com/in/a\nwww.a.dev/work\n"));
    expect(links.map((link) => link.label)).toEqual(["a.dev", "LinkedIn", "GitHub"]);
    expect(links[0].href).toBe("https://www.a.dev/work");
  });

  it("ignores email, phone and location, and lists each URL once", () => {
    const links = codeLinks(cv("# A\nEngineer\na@b.example | +44 7700 900123\ngithub.com/a\ngithub.com/a\n"));
    expect(links).toHaveLength(1);
  });
});

describe("resolveCodeLink", () => {
  const sample = cv(sampleMarkdown);

  it("takes the best link on auto, and nothing when off", () => {
    expect(resolveCodeLink(sample, "auto")?.label).toBe("LinkedIn");
    expect(resolveCodeLink(sample, "off")).toBeNull();
  });

  it("honours a chosen URL while it is still in the header", () => {
    expect(resolveCodeLink(sample, "https://github.com/jordanavery")?.label).toBe("GitHub");
  });

  // Fixing a typo in a handle must not quietly take the code off the page.
  it("falls back to the best link when the chosen one has been edited out", () => {
    expect(resolveCodeLink(sample, "https://github.com/someone-else")?.label).toBe("LinkedIn");
  });

  it("gives nothing when the header has no link at all", () => {
    expect(resolveCodeLink(cv("# A\nEngineer\na@b.example\n"), "auto")).toBeNull();
  });
});
