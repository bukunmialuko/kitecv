import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/sample.body.html?raw";
import { sampleMarkdown } from "./assets";
import { parseCv } from "./parse";
import { esc, inline, renderBody, renderDocument } from "./render";
import { loadTemplate, templateMeta } from "./templates";

const norm = (html: string): string => html.replace(/\s+/g, " ").trim();

const cv = (markdown: string) => parseCv(markdown).data;

const HEADER = `# Jane Doe
Software Engineer
jane@example.com
`;

/**
 * The port-fidelity test.
 *
 * The fixture was generated from the Python renderer in
 * skill-bridge/tool-01-cv-renderer, which was verified against a real PDF —
 * 3 pages, 16 clickable links, 5 embedded font weights, alignment stress-tested.
 * One assertion therefore pins the parser, renderer, icons, escaping and section
 * ordering all at once.
 *
 * Regenerate the fixture only when a rendering change is intentional.
 */
describe("port fidelity", () => {
  it("renders the sample byte-for-byte as the verified Python renderer does", () => {
    expect(norm(renderBody(cv(sampleMarkdown)))).toBe(norm(fixture));
  });
});

describe("esc", () => {
  it("escapes the four characters that matter", () => {
    expect(esc(`& < > "`)).toBe("&amp; &lt; &gt; &quot;");
  });
});

describe("inline", () => {
  it("renders bold, italic and code", () => {
    expect(inline("**b**")).toBe("<strong>b</strong>");
    expect(inline("*i*")).toBe("<em>i</em>");
    expect(inline("`c`")).toBe("<code>c</code>");
  });

  it("renders markdown links and bare URLs", () => {
    expect(inline("[docs](https://x.example)")).toContain('href="https://x.example"');
    expect(inline("see https://x.example/y")).toContain('<a href="https://x.example/y"');
  });

  // The placeholder stash is the subtlest part of the port: code spans and
  // links are lifted out before the bold and URL passes so those passes cannot
  // reach inside them.
  it("leaves markup inside a code span literal", () => {
    const out = inline("`**not bold**`");
    expect(out).toBe("<code>**not bold**</code>");
    expect(out).not.toContain("<strong>");
  });

  it("does not linkify a URL that is already inside a link", () => {
    const out = inline("[site](https://x.example)");
    expect(out.match(/<a /g)).toHaveLength(1);
  });

  it("escapes before formatting, so raw HTML cannot get through", () => {
    expect(inline("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("entries", () => {
  const withUrl = `${HEADER}
## Experience
### [Acme](https://acme.example) | 2023 – Present
Engineer | Remote
- Did a thing.
Tech: Go, Redis
`;
  const withoutUrl = withUrl.replace("[Acme](https://acme.example)", "Acme");

  it("links the company name when a url is present", () => {
    expect(renderBody(cv(withUrl))).toContain('<a href="https://acme.example"');
  });

  it("leaves the company as plain text without one", () => {
    expect(renderBody(cv(withoutUrl))).not.toContain("<a href=");
  });

  it("drops chips when showChips is false", () => {
    expect(renderBody(cv(withUrl))).toContain('class="chip"');
    expect(renderBody(cv(withUrl), { showChips: false })).not.toContain('class="chip"');
  });

  it("drops the projects section when showProjects is false", () => {
    const md = `${HEADER}\n## Projects\n### P | 2024\n- x\n`;
    expect(renderBody(cv(md))).toContain("Projects");
    expect(renderBody(cv(md), { showProjects: false })).not.toContain("Projects");
  });

  it("emits sections in the order the markdown used", () => {
    const md = `${HEADER}\n## Skills\nGo\n\n## Summary\nHi.\n`;
    const html = renderBody(cv(md));
    expect(html.indexOf("Skills")).toBeLessThan(html.indexOf("Summary"));
  });
});

describe("renderDocument is self-contained", () => {
  const doc = renderDocument(cv(sampleMarkdown));

  it("embeds the font as a data URI", () => {
    expect(doc).toContain("data:font/woff2;base64,");
    expect(doc).toContain("@font-face");
  });

  it("sets the A4 page box, and Letter on request", () => {
    expect(doc).toContain("@page { size: A4;");
    expect(renderDocument(cv(sampleMarkdown), { page: "letter" })).toContain("@page { size: Letter;");
  });

  // If any of these appear, the CV stops rendering the moment it leaves the app
  // — in the PDF function, or in a file saved to disk.
  it("references nothing external and carries no Tailwind classes", () => {
    expect(doc).not.toContain('src="http');
    expect(doc).not.toContain("<link rel=\"stylesheet\"");
    expect(doc).not.toMatch(/class="[^"]*\b(?:flex-\w|bg-\[|text-\[|dark:)/);
  });
});

/**
 * Fonts hang off the template rather than the document, and this is the test
 * that keeps them there. Each family costs 50-150KB once base64-inlined, so the
 * moment a shared block creeps back every Classic export silently starts
 * carrying Plex's four faces.
 */
describe("templates carry their own fonts", () => {
  const doc = async (id: string) =>
    renderDocument(cv(sampleMarkdown), { template: await loadTemplate(id) });
  const faces = (html: string) => html.match(/@font-face/g)?.length ?? 0;

  it("embeds one face for Classic and four for Plex", async () => {
    expect(faces(await doc("classic"))).toBe(1);
    expect(faces(await doc("plex"))).toBe(4);
  });

  it("keeps a Classic export free of the Plex families", async () => {
    const classic = await doc("classic");
    expect(classic).not.toContain("Archivo");
    expect(classic).not.toContain("IBM Plex");
  });

  it("declares every family the Plex stylesheet asks for", async () => {
    const plex = await doc("plex");
    for (const family of ["Archivo", "IBM Plex Sans", "IBM Plex Mono"]) {
      expect(plex).toContain(`font-family: '${family}'`);
    }
  });

  it("gives every registered template a font block, so none renders in a fallback", async () => {
    for (const meta of templateMeta) {
      const template = await loadTemplate(meta.id);
      expect(template.fontCss).toContain("data:font/woff2;base64,");
    }
  });

  // An unknown id must not render an unstyled CV: a `templateId` left in
  // localStorage by a build that shipped a template this one doesn't have
  // should degrade to the default.
  it("falls back to Classic for an unknown id", async () => {
    expect((await loadTemplate("nope")).id).toBe("classic");
    expect((await loadTemplate(undefined)).id).toBe("classic");
  });
});
