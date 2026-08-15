import { describe, expect, it } from "vitest";
import { classifyContact, parseCv, parseFrontMatter, splitDateRange, splitLink } from "./parse";

const header = `# Jane Doe
Software Engineer
Bristol, UK | +44 7700 900123
jane@example.com
`;

describe("front matter", () => {
  it("reads booleans in every accepted spelling", () => {
    const { options } = parseFrontMatter("---\nprojects: false\nchips: yes\nx: off\n---\n# A\n");
    expect(options).toEqual({ projects: false, chips: true, x: false });
  });

  it("leaves a document without front matter untouched", () => {
    const { options, body } = parseFrontMatter("# A\n");
    expect(options).toEqual({});
    expect(body).toBe("# A\n");
  });
});

describe("splitLink", () => {
  it("pulls a markdown link apart", () => {
    expect(splitLink("[Acme](https://acme.example)")).toEqual(["Acme", "https://acme.example"]);
  });
  it("leaves a bare title alone", () => {
    expect(splitLink("Acme")).toEqual(["Acme", ""]);
  });
});

describe("splitDateRange", () => {
  it.each([
    ["March 2023 – Present", ["March 2023", "Present"]],
    ["2012 – 2016", ["2012", "2016"]],
    ["2012-2017", ["2012", "2017"]],
    ["January 2023 – 2025", ["January 2023", "2025"]],
    ["June 2014 to July 2014", ["June 2014", "July 2014"]],
    ["August 2024", ["August 2024", ""]],
  ])("splits %s", (input, expected) => {
    expect(splitDateRange(input as string)).toEqual(expected);
  });
});

describe("classifyContact", () => {
  it.each([
    ["jane@example.com", "email"],
    ["+44 7700 900123", "phone"],
    ["linkedin.com/in/jane", "linkedin"],
    ["github.com/jane", "github"],
    ["jane.example", "link"],
    ["Bristol, United Kingdom", "location"],
  ])("classifies %s as %s", (token, kind) => {
    expect(classifyContact(token as string).kind).toBe(kind);
  });

  it("builds mailto and tel hrefs", () => {
    expect(classifyContact("jane@example.com").href).toBe("mailto:jane@example.com");
    expect(classifyContact("+44 7700 900123").href).toBe("tel:+447700900123");
  });
});

describe("header", () => {
  it("reads the name, the job title and the contact rows", () => {
    const { data } = parseCv(header);
    expect(data.name).toBe("Jane Doe");
    expect(data.title).toBe("Software Engineer");
    expect(data.contact.email).toBe("jane@example.com");
    expect(data.contact.phone).toBe("+44 7700 900123");
    expect(data.contact.location).toBe("Bristol, UK");
    expect(data.contact.rows).toHaveLength(2);
  });

  it("treats a title containing an ampersand as a title, not a contact row", () => {
    const { data } = parseCv("# A B\nSoftware & AI Engineer\nx@y.com\n");
    expect(data.title).toBe("Software & AI Engineer");
    expect(data.contact.rows).toHaveLength(1);
  });
});

describe("entry grammar", () => {
  const md = `${header}
## Experience
### [Acme](https://acme.example) | March 2023 – Present
Senior Engineer | Remote
- Cut latency 40% by adding a cache.
Tech: Go, Redis

### Bramble & Co | July 2016 – August 2017
Developer | Leeds, UK
- Built the thing.
`;

  it("splits the bold row, the sub row, bullets and chips", () => {
    const { data } = parseCv(md);
    const [first, second] = data.experience;
    expect(first.company).toBe("Acme");
    expect(first.url).toBe("https://acme.example");
    expect(first.start).toBe("March 2023");
    expect(first.end).toBe("Present");
    expect(first.role).toBe("Senior Engineer");
    expect(first.location).toBe("Remote");
    expect(first.technologies).toEqual(["Go", "Redis"]);
    // A bare title yields no url, and an ampersand survives.
    expect(second.company).toBe("Bramble & Co");
    expect(second.url).toBe("");
    expect(second.technologies).toEqual([]);
  });

  // This was a real bug: continuation lines were silently dropped, eating 33
  // lines of a CV without any warning.
  it("joins an indented continuation line onto the bullet above it", () => {
    const { data, findings } = parseCv(`${header}
## Experience
### Acme | 2023 – Present
Engineer | Remote
- One bullet that runs on
  across two source lines.
- Second bullet.
`);
    expect(data.experience[0].highlights).toEqual([
      "One bullet that runs on across two source lines.",
      "Second bullet.",
    ]);
    expect(findings).toHaveLength(0);
  });

  it("still treats a wholly indented list as bullets", () => {
    const { data } = parseCv(`${header}
## Experience
### Acme | 2023 – Present
Engineer | Remote
  - One.
  - Two.
`);
    expect(data.experience[0].highlights).toEqual(["One.", "Two."]);
  });

  it.each(["Tech", "Technologies", "Stack"])("accepts %s: as the chip line", (word) => {
    const { data } = parseCv(`${header}
## Experience
### Acme | 2023 – Present
Engineer | Remote
- A bullet.
${word}: Go, Redis
`);
    expect(data.experience[0].technologies).toEqual(["Go", "Redis"]);
  });
});

describe("sections", () => {
  it("matches headings case-insensitively via aliases", () => {
    const { data } = parseCv(`${header}\n## WORK EXPERIENCE\n### A | 2023\nB | C\n- x\n`);
    expect(data.sectionOrder).toEqual(["experience"]);
  });

  it("preserves the order the headings appeared in", () => {
    const { data } = parseCv(`${header}
## Skills
Languages: Go

## Summary
Hello.
`);
    expect(data.sectionOrder).toEqual(["skills", "summary"]);
  });

  it("reports an unknown heading instead of dropping it silently", () => {
    const { findings } = parseCv(`${header}\n## Hobbies\nChess\n`);
    expect(findings.map((f) => f.type)).toContain("unknown_section");
  });

  it("splits a skills label on the first colon only", () => {
    const { data } = parseCv(`${header}\n## Skills\nAI / ML: agents, RAG, vector databases\n`);
    expect(data.skills).toEqual(["AI / ML: agents, RAG, vector databases"]);
  });
});

describe("projects and education", () => {
  it("separates a period from a link on the right-hand side", () => {
    const { data } = parseCv(`${header}
## Projects
### Ledgerly | 2023 – Present · ledgerly.example
- A thing.

### Nivy | 2026
- Another.

### Cadence | cadence.example
- A third.
`);
    expect(data.projects[0]).toMatchObject({ period: "2023 – Present", link: "ledgerly.example" });
    expect(data.projects[1]).toMatchObject({ period: "2026", link: "" });
    expect(data.projects[2]).toMatchObject({ period: "", link: "cadence.example" });
  });

  it("splits '<degree> in <field>' but keeps a plain degree whole", () => {
    const { data } = parseCv(`${header}
## Education
### Uni | 2024
M.Sc. in Computer Science

### Poly | 2016
B.Sc. Mechanical Engineering
`);
    expect(data.education[0]).toMatchObject({ degree: "M.Sc.", field: "Computer Science" });
    expect(data.education[1]).toMatchObject({ degree: "B.Sc. Mechanical Engineering", field: "" });
  });
});
