/**
 * The anti-drift check.
 *
 * Two documents describing one format will drift. Rather than hoping they don't,
 * every snippet in the guide is parsed here, and the ones whose prose makes a
 * specific claim are asserted to actually produce it. If the format changes so a
 * documented example stops working, this fails instead of the docs quietly lying.
 */
import { describe, expect, it } from "vitest";
import { parseCv } from "../core/parse";
import { renderBody } from "../core/render";
import { topics } from "./topics";

const byId = (id: string) => {
  const topic = topics.find((t) => t.id === id);
  if (!topic) throw new Error(`no guide topic "${id}"`);
  return parseCv(topic.markdown);
};

describe("guide structure", () => {
  it("has unique ids and no empty fields", () => {
    const ids = topics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const topic of topics) {
      expect(topic.title.trim()).not.toBe("");
      expect(topic.body.trim()).not.toBe("");
      expect(topic.markdown.trim()).not.toBe("");
    }
  });
});

describe("every snippet is valid", () => {
  it.each(topics.map((t) => [t.id, t] as const))(
    "%s parses with no structural complaints",
    (_id, topic) => {
      const { findings } = parseCv(topic.markdown);
      expect(findings.map((f) => `${f.type}: ${f.message}`)).toEqual([]);
    },
  );

  it.each(topics.map((t) => [t.id, t] as const))("%s renders without throwing", (_id, topic) => {
    expect(renderBody(parseCv(topic.markdown).data).length).toBeGreaterThan(0);
  });
});

describe("snippets prove what their prose claims", () => {
  it("header: name, title and contact rows", () => {
    const { data } = byId("header");
    expect(data.name).toBe("Jordan Avery");
    expect(data.title).toBe("Software Engineer");
    expect(data.contact.rows.length).toBeGreaterThan(1);
    expect(data.contact.rows[0]).toHaveLength(2); // the piped line
  });

  it("links: the company name really carries a url", () => {
    const { data } = byId("links");
    expect(data.experience[0].url).toBe("https://northwind.example");
  });

  it("chips: the Tech line becomes technologies", () => {
    const { data } = byId("chips");
    expect(data.experience[0].technologies).toEqual(["Go", "PostgreSQL", "Redis", "Kubernetes"]);
  });

  it("skills: only the first colon splits the label", () => {
    const { data } = byId("skills");
    expect(data.skills[1].startsWith("AI / ML:")).toBe(true);
  });

  it("sections: aliases resolve and order follows the document", () => {
    const { data } = byId("sections");
    expect(data.sectionOrder).toEqual(["experience", "projects"]);
  });

  it("spacing: the blank lines produce a spacing step", () => {
    const { data } = byId("spacing");
    expect(data.experience[0].spacing).toBe(0);
    expect(data.experience[1].spacing).toBeGreaterThan(0);
  });

  it("pagebreak: the --- marks the next entry", () => {
    const { data } = byId("pagebreak");
    expect(data.experience[0].pageBreak).toBe(false);
    expect(data.experience[1].pageBreak).toBe(true);
  });

  it("frontmatter: the toggles are read, not rendered as content", () => {
    const { data, options } = byId("frontmatter");
    expect(options.projects).toBe(false);
    expect(options.chips).toBe(false);
    // The leading `---` is front matter, never a page break.
    expect(data.experience[0].pageBreak).toBe(false);
  });

  it("analysis: the example really is a reversed date range", () => {
    const { data } = byId("analysis");
    expect(data.experience[0].start).toBe("December 2024");
    expect(data.experience[0].end).toBe("March 2024");
  });
});
