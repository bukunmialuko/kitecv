/**
 * The formatter's contract.
 *
 * Two properties carry the feature, and they are the reason it can be run
 * automatically while someone is typing:
 *
 *   1. Formatting is parse-preserving — the CV that comes back out is the one
 *      that went in, apart from the date dash the formatter is allowed to fix.
 *   2. Formatting is idempotent — running it again changes nothing, so an idle
 *      timer cannot walk a document somewhere new one keystroke at a time.
 *
 * Everything else here is a single rule, spelled out so a change to one of them
 * fails loudly rather than quietly reflowing everybody's CV.
 */
import { describe, expect, it } from "vitest";
import { sampleMarkdown } from "./assets";
import { formatColumn, formatMarkdown, mapCaret } from "./format";
import { parseCv } from "./parse";
import type { Cv } from "./types";

/**
 * The one thing formatting is allowed to change on the page: the printed date
 * column. Experience already renders an en dash whatever the source said, but
 * Education and Projects print their column verbatim, so those two strings move.
 */
const dashed = (data: Cv): Cv => ({
  ...data,
  projects: data.projects.map((p) => ({ ...p, period: formatColumn(p.period) })),
  education: data.education.map((e) => ({ ...e, year: formatColumn(e.year) })),
});

/** Every sin the formatter is meant to absorb, in one document. */
const messy = [
  "---",
  "  projects:true",
  "chips :  false",
  "---",
  "",
  "",
  "#   Jordan Avery   ",
  "Software Engineer",
  "",
  "",
  "Bristol, UK|+44 7700 900123",
  "jordan@example.com·github.com/jordanavery",
  "",
  "## Experience",
  "",
  "",
  "###   [ Northwind Systems ]( https://northwind.example )|March 2023-Present",
  "Senior Software Engineer|Remote",
  "*  Cut checkout p95 latency from 840ms to 310ms by adding read replicas,",
  "        lifting conversion 4% on mobile.\t",
  "",
  "- Led the migration of 60+ services onto per-service schemas.",
  "TECH :Go,PostgreSQL,  Redis,",
  "",
  "",
  "",
  "",
  "",
  "### Harbour Analytics | January 2021 — February 2023",
  "Software Engineer | Bristol, UK",
  "- Rebuilt the nightly reporting job as a resumable pipeline.",
  "",
  "  ---  ",
  "",
  "",
  "### Bramble & Co | 2016 to 2017",
  "Software Developer",
  "- Built the stock reconciliation tool.",
  "",
  "## Selected Projects",
  "### Ledgerly|2023 – Present·ledgerly.example",
  "Self-hosted expense tracker",
  "stack: Python,SQLite",
  "",
  "---",
  "## Education",
  "### Northgate University|2012-2016",
  "M.Sc. Software Engineering",
].join("\r\n");

describe("the sample is already canonical", () => {
  it("formats to itself", () => {
    expect(formatMarkdown(sampleMarkdown)).toBe(sampleMarkdown);
  });
});

describe("the two properties the feature rests on", () => {
  it("keeps the parsed CV identical, apart from the date column", () => {
    const before = parseCv(messy);
    const after = parseCv(formatMarkdown(messy));
    expect(after.data).toEqual(dashed(before.data));
    expect(after.options).toEqual(before.options);
    expect(after.findings).toEqual(before.findings);
  });

  it("is idempotent", () => {
    const once = formatMarkdown(messy);
    expect(formatMarkdown(once)).toBe(once);
  });

  it("is idempotent on the guide's own spacing and page-break examples", () => {
    for (const source of [messy, sampleMarkdown, "", "# A\n", "---\n"]) {
      const once = formatMarkdown(source);
      expect(formatMarkdown(once)).toBe(once);
    }
  });
});

describe("what it rewrites", () => {
  const format = (lines: string[]) => formatMarkdown(lines.join("\n")).split("\n");

  it("puts one space around the column pipe", () => {
    expect(format(["## Experience", "### Acme|2023 – 2024", "Engineer|Remote"])).toEqual([
      "## Experience",
      "### Acme | 2023 – 2024",
      "Engineer | Remote",
      "",
    ]);
  });

  it("keeps the pipe when the left half is empty, so the column does not move", () => {
    const cv = parseCv(formatMarkdown("## Experience\n### Acme | 2023\n| Remote\n")).data;
    expect(cv.experience[0].role).toBe("");
    expect(cv.experience[0].location).toBe("Remote");
  });

  it("normalises bullets and indents their continuations by two", () => {
    expect(format(["## Experience", "### Acme | 2023", "*   Did a thing", "      and then some"]))
      .toEqual(["## Experience", "### Acme | 2023", "- Did a thing", "  and then some", ""]);
  });

  it("rewrites a Tech line without renaming the keyword", () => {
    expect(format(["## Experience", "### Acme | 2023", "stack:Go,  Redis,"])).toEqual([
      "## Experience",
      "### Acme | 2023",
      "Stack: Go, Redis",
      "",
    ]);
  });

  it("tidies the link on an entry title", () => {
    expect(format(["## Experience", "### [ Acme ]( https://acme.example ) | 2023"])).toEqual([
      "## Experience",
      "### [Acme](https://acme.example) | 2023",
      "",
    ]);
  });

  it("normalises a date range to an en dash", () => {
    expect(formatColumn("2012-2016")).toBe("2012 – 2016");
    expect(formatColumn("March 2023 to Present")).toBe("March 2023 – Present");
    expect(formatColumn("2023 — Present · ledgerly.example")).toBe(
      "2023 – Present · ledgerly.example",
    );
  });

  it("leaves a right-hand column alone when it is not a date range", () => {
    expect(formatColumn("Remote - Contract")).toBe("Remote - Contract");
    expect(formatColumn("August 2024")).toBe("August 2024");
  });

  it("strips trailing whitespace, tabs and carriage returns", () => {
    expect(formatMarkdown("# A  \r\n\tSoftware Engineer\r\n")).toBe("# A\nSoftware Engineer\n");
  });

  it("ends the file with exactly one newline", () => {
    expect(formatMarkdown("# A\n\n\n")).toBe("# A\n");
    expect(formatMarkdown("# A")).toBe("# A\n");
    expect(formatMarkdown("   \n")).toBe("");
  });
});

describe("the caret survives a rewrite under it", () => {
  const before = "## Experience\n### Acme|2023\n\n\n*  Shipped the thing\n";
  const after = formatMarkdown(before);

  /** The caret sits directly after the given text. */
  const at = (text: string, needle: string) => text.indexOf(needle) + needle.length;

  it("stays under the same letter when the lines around it move", () => {
    expect(mapCaret(before, after, at(before, "Shipped the"))).toBe(at(after, "Shipped the"));
    expect(mapCaret(before, after, at(before, "Acme"))).toBe(at(after, "Acme"));
  });

  it("pins both ends", () => {
    expect(mapCaret(before, after, 0)).toBe(0);
    expect(mapCaret(before, after, before.length)).toBe(after.length);
  });

  it("does not run off the end of a shorter document", () => {
    expect(mapCaret(before, after, before.length + 10)).toBe(after.length);
  });
});

describe("what it refuses to touch", () => {
  it("preserves the spacing steps between entries", () => {
    const source = [
      "## Experience",
      "### A | 2023",
      "- x",
      "",
      "### B | 2022",
      "- x",
      "",
      "",
      "### C | 2021",
      "- x",
      "",
      "",
      "",
      "",
      "",
      "",
      "### D | 2020",
      "- x",
    ].join("\n");
    const spacing = parseCv(formatMarkdown(source)).data.experience.map((e) => e.spacing);
    expect(spacing).toEqual([0, 0, 1, 3]);
    // Beyond the cap extra blank lines stop counting, so they are dropped
    // rather than carried around for ever: four is the widest gap it will emit.
    expect(formatMarkdown(source)).not.toContain("\n\n\n\n\n\n");
  });

  it("keeps a page break on the entry it belonged to", () => {
    const cv = parseCv(
      formatMarkdown("## Experience\n### A | 2023\n- x\n---\n### B | 2022\n- x\n"),
    ).data;
    expect(cv.experience.map((e) => e.pageBreak)).toEqual([false, true]);
  });

  it("keeps a page break that precedes a whole section", () => {
    const cv = parseCv(formatMarkdown("## Experience\n### A | 2023\n- x\n---\n## Education\n### B | 2022\n")).data;
    expect(cv.sectionBreaks).toEqual(["education"]);
  });

  it("leaves prose sections exactly as typed", () => {
    const source = [
      "## Summary",
      "One  paragraph, with  its own spacing.",
      "",
      "## Skills",
      "Languages: Python,Go",
      "- Backend:PostgreSQL",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(`${source}\n`);
  });

  it("does not turn front matter into a page break, or the reverse", () => {
    const { options, data } = parseCv(formatMarkdown(messy));
    expect(options).toEqual({ projects: true, chips: false });
    expect(data.experience[0].pageBreak).toBe(false);
  });

  it("keeps a front-matter comment", () => {
    expect(formatMarkdown("---\n# why\nchips: false\n---\n# A\n")).toBe(
      "---\n# why\nchips: false\n---\n\n# A\n",
    );
  });
});
