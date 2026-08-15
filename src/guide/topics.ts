/**
 * The in-app guide, as data.
 *
 * Plain objects rather than JSX so `guide.test.ts` can iterate every snippet and
 * assert it still parses — a doc that quietly stops being true is worse than no
 * doc. See CLAUDE.md → Invariants.
 */
export interface Topic {
  id: string;
  title: string;
  /** One or two sentences. Plain text; the component handles layout. */
  body: string;
  /** A real, parseable snippet. Verified by the test suite. */
  markdown: string;
  /** Shown under the snippet as a smaller aside. */
  note?: string;
}

const HEADER = `# Jordan Avery
Software Engineer
jane@example.com
`;

export const topics: Topic[] = [
  {
    id: "shape",
    title: "The whole format",
    body:
      "A CV is a header, then sections. Every section is a `##` heading; every " +
      "role, project or degree under it is a `###` entry. That is the whole idea.",
    markdown: `# Jordan Avery
Software Engineer
Bristol, UK | +44 7700 900123
jordan@example.com
github.com/jordanavery

## Summary
Software engineer with 10+ years building production systems.

## Skills
Languages: Python, Go, TypeScript

## Experience
### Northwind Systems | March 2023 – Present
Senior Software Engineer | Remote
- Cut checkout p95 latency from 840ms to 310ms by adding read replicas.
Tech: Go, PostgreSQL, Redis

## Education
### Northgate University | 2022
M.Sc. Software Engineering`,
  },
  {
    id: "header",
    title: "Header",
    body:
      "The `#` line is your name. The next plain line is your job title. Every " +
      "line after that is a contact row, right-aligned in the CV.",
    markdown: `# Jordan Avery
Software Engineer
Bristol, UK | +44 7700 900123
jordan@example.com
linkedin.com/in/jordanavery
github.com/jordanavery`,
    note:
      "Icons are chosen automatically from what each token looks like — an " +
      "address gets an envelope, a github.com URL gets the GitHub mark. Put two " +
      "on one line by separating them with a pipe.",
  },
  {
    id: "entries",
    title: "Entries",
    body:
      "Experience, Projects and Education all share one shape: a bold row, an " +
      "optional plain row under it, then bullets. The pipe splits left from right.",
    markdown: `${HEADER}
## Experience
### Northwind Systems | March 2023 – Present
Senior Software Engineer | Remote
- Cut checkout p95 latency from 840ms to 310ms.
- Led the migration of 60+ services onto per-service schemas.`,
    note:
      "In Experience the bold row is company and dates, and the row beneath is " +
      "role and location. In Projects it is name and period. In Education it is " +
      "institution and year, with the degree beneath.",
  },
  {
    id: "links",
    title: "Links",
    body:
      "A company, project or university name can carry a link. The name itself " +
      "becomes clickable — in the preview and in the downloaded PDF.",
    markdown: `${HEADER}
## Experience
### [Northwind Systems](https://northwind.example) | March 2023 – Present
Senior Software Engineer | Remote
- Shipped the public API, documented at [the portal](https://northwind.example/docs).`,
    note: "Leave the link out and the name renders as plain bold text.",
  },
  {
    id: "chips",
    title: "Technology chips",
    body:
      "End an entry with a `Tech:` line and each comma-separated item becomes a " +
      "chip under the bullets.",
    markdown: `${HEADER}
## Experience
### Northwind Systems | March 2023 – Present
Senior Software Engineer | Remote
- Cut checkout p95 latency from 840ms to 310ms.
Tech: Go, PostgreSQL, Redis, Kubernetes`,
    note: "`Technologies:` and `Stack:` work the same way.",
  },
  {
    id: "skills",
    title: "Skills",
    body:
      "One line per line — no bullets, no nesting. Everything before the first " +
      "colon becomes the category label, set small and uppercase in a fixed " +
      "gutter down the left edge, with the values in their own column beside it.",
    markdown: `${HEADER}
## Skills
Languages: Python, Go, TypeScript, SQL
AI / ML: RAG pipelines, vector databases, prompt engineering
Tools / Infra: PostgreSQL, Docker, Redis, Terraform`,
    note:
      "Only the first colon splits, so a label can contain slashes, spaces and " +
      "punctuation.",
  },
  {
    id: "sections",
    title: "Sections and their order",
    body:
      "Sections render in the order you write them, so moving one is an edit " +
      "here rather than a setting somewhere else.",
    markdown: `${HEADER}
## Work Experience
### Northwind Systems | 2023 – Present
Engineer | Remote
- Did a thing.

## Selected Projects
### Ledgerly | 2024 – Present · ledgerly.example
- Built a thing.`,
    note:
      "Headings are matched loosely: Work Experience, Employment and " +
      "Professional Experience all mean Experience. Summary, Skills, Projects, " +
      "Education and Certifications are the others.",
  },
  {
    id: "spacing",
    title: "Extra space between entries",
    body:
      "One blank line between entries is normal. Each extra blank line adds a " +
      "step of space — useful for nudging content across a page boundary.",
    markdown: `${HEADER}
## Experience
### Northwind Systems | 2023 – Present
Engineer | Remote
- Did a thing.


### Harbour Analytics | 2021 – 2023
Engineer | Bristol, UK
- Did another thing.`,
    note: "Three extra blank lines is the maximum; more has no further effect.",
  },
  {
    id: "pagebreak",
    title: "Forcing a new page",
    body:
      "A line of three dashes pushes whatever follows onto a new page. Put it " +
      "before a `###` to move one entry, or before a `##` to move a whole section.",
    markdown: `${HEADER}
## Experience
### Northwind Systems | 2023 – Present
Engineer | Remote
- Did a thing.

---

### Harbour Analytics | 2021 – 2023
Engineer | Bristol, UK
- This role starts a new page.`,
    note:
      "Entries flow across pages on their own, splitting between bullets — this " +
      "is only for when you want to override that.",
  },
  {
    id: "frontmatter",
    title: "Hiding sections",
    body:
      "A small block at the very top toggles parts of the CV off without " +
      "deleting them, which is handy when tailoring for one application.",
    markdown: `---
projects: false
chips: false
---

# Jordan Avery
Software Engineer
jordan@example.com

## Experience
### Northwind Systems | 2023 – Present
Engineer | Remote
- Did a thing.
Tech: Go, Redis`,
    note: "`projects: false` drops the Projects section; `chips: false` drops every Tech line.",
  },
  {
    id: "inline",
    title: "Inline formatting",
    body: "Inside bullets and the summary you can use bold, italic, code and links.",
    markdown: `${HEADER}
## Experience
### Northwind Systems | 2023 – Present
Engineer | Remote
- Rebuilt the scheduling screen in **React**, replacing a table that reflowed.
- Built the metrics API in \`Go\`, serving 40M requests a month.
- Documented at [the developer portal](https://northwind.example/docs).`,
  },
  {
    id: "analysis",
    title: "What Analysis checks",
    body:
      "The Analysis tab reads your dates and flags problems as you type. " +
      "Errors are things that are wrong; warnings are things worth a look.",
    markdown: `${HEADER}
## Experience
### Northwind Systems | December 2024 – March 2024
Engineer | Remote
- This entry ends before it starts, which Analysis reports as an error.`,
    note:
      "It checks reversed dates, entries listed out of order, gaps of three " +
      "months or more between roles, dates in the future, and missing pieces " +
      "such as an email address or a summary. Overlapping roles are noted but " +
      "not treated as a fault.",
  },
];
