import { describe, expect, it } from "vitest";
import { parseCv } from "./parse";
import { buildReport, parseMonthYear } from "./report";
import type { Finding, Report } from "./types";

/**
 * Every case pins `today`. `Present` resolves against it, so without injection
 * this suite would pass in August and fail in December.
 */
const TODAY = new Date(2026, 7, 15); // 15 August 2026

const HEADER = `# Jane Doe
Software Engineer
Bristol, UK
jane@example.com

## Summary
A summary.

## Skills
Languages: Go
`;

function report(markdown: string): Report {
  const { data, findings } = parseCv(markdown);
  return buildReport(data, findings, TODAY);
}

const types = (r: Report): string[] => r.findings.map((f) => f.type);
const of = (r: Report, type: string): Finding | undefined =>
  r.findings.find((f) => f.type === type);

describe("parseMonthYear", () => {
  it("widens a bare year to the edges of that year", () => {
    expect(parseMonthYear("2012", false, TODAY)).toEqual([2012, 1]);
    expect(parseMonthYear("2012", true, TODAY)).toEqual([2012, 12]);
  });

  it("resolves Present against the injected today", () => {
    expect(parseMonthYear("Present", false, TODAY)).toEqual([2026, 8]);
  });

  it("returns null for something with no year in it", () => {
    expect(parseMonthYear("sometime", false, TODAY)).toBeNull();
  });
});

describe("timeline", () => {
  it("flags dates the wrong way round as an error", () => {
    const r = report(`${HEADER}
## Experience
### Acme | December 2024 – March 2024
Engineer | Remote
- x
`);
    expect(of(r, "end_before_start")?.severity).toBe("error");
  });

  it("flags an entry that starts later than the one above it", () => {
    const r = report(`${HEADER}
## Experience
### Old | January 2019 – January 2020
Engineer | Remote
- x

### New | January 2023 – Present
Engineer | Remote
- y
`);
    expect(of(r, "out_of_order")?.severity).toBe("warning");
  });

  it("flags a gap of three months but not two", () => {
    const gapped = report(`${HEADER}
## Experience
### New | June 2024 – Present
Engineer | Remote
- x

### Old | January 2020 – January 2024
Engineer | Remote
- y
`);
    expect(of(gapped, "gap")?.message).toContain("4-month gap");

    const tight = report(`${HEADER}
## Experience
### New | April 2024 – Present
Engineer | Remote
- x

### Old | January 2020 – January 2024
Engineer | Remote
- y
`);
    expect(types(tight)).not.toContain("gap");
  });

  it("treats concurrent roles as info, not a fault", () => {
    const r = report(`${HEADER}
## Experience
### Side | January 2024 – Present
Advisor | Remote
- x

### Main | January 2020 – Present
Engineer | Remote
- y
`);
    expect(of(r, "overlap")?.severity).toBe("info");
    expect(r.summary.errorCount).toBe(0);
  });

  it("flags a start date in the future", () => {
    const r = report(`${HEADER}
## Experience
### Future | January 2030 – Present
Engineer | Remote
- x
`);
    expect(of(r, "future_start")?.severity).toBe("warning");
  });

  it("merges overlapping spans instead of double-counting them", () => {
    const r = report(`${HEADER}
## Experience
### A | January 2020 – January 2022
Engineer | Remote
- x

### B | January 2020 – January 2022
Advisor | Remote
- y
`);
    // Two identical 25-month spans are 25 months of work, not 50.
    expect(r.summary.totalExperienceMonths).toBe(25);
  });
});

describe("missing", () => {
  it("reports absent name, email, summary and skills", () => {
    const r = report("# \n");
    expect(types(r)).toEqual(
      expect.arrayContaining(["missing_name", "missing_email", "missing_summary", "missing_skills"]),
    );
  });

  it("reports a section that is present but empty", () => {
    const r = report(`${HEADER}\n## Experience\n`);
    expect(types(r)).toContain("empty_section");
  });

  // Education legitimately carries no bullets, so flagging it would train the
  // reader to ignore the report. This was a real bug, caught late.
  it("wants bullets on experience and projects but never on education", () => {
    const r = report(`${HEADER}
## Experience
### Acme | 2023 – Present
Engineer | Remote

## Education
### Uni | 2024
M.Sc. Computer Science
`);
    const noBullets = r.findings.filter((f) => f.type === "entry_no_bullets");
    expect(noBullets).toHaveLength(1);
    expect(noBullets[0].section).toBe("experience");
  });

  it("wants dates on experience and education but not on projects", () => {
    const r = report(`${HEADER}
## Projects
### Ledgerly
- A thing.
`);
    expect(types(r)).not.toContain("entry_no_dates");
  });
});

describe("ordering", () => {
  it("sorts findings error, then warning, then info", () => {
    const r = report(`${HEADER}
## Experience
### Bad | December 2024 – March 2024
Engineer | Remote

### Older | January 2015 – January 2016
Engineer | Remote
- y
`);
    const ranks = r.findings.map((f) => ["error", "warning", "info"].indexOf(f.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});
