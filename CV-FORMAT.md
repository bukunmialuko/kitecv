# CV markdown format

The input contract for `render.py`. It is deliberately small: one heading level
per job, one uniform grammar shared by every entry section, and nothing that
needs escaping in normal use.

This file is the **single source of truth** for the format. A future Claude skill
that converts an arbitrary PDF CV into this shape targets exactly what is written
here.

---

## The whole format at a glance

```markdown
---
projects: true
chips: true
---

# Jordan Avery
Software Engineer
Bristol, United Kingdom | +44 7700 900123
jordan.avery@example.com
linkedin.com/in/jordanavery
github.com/jordanavery

## Summary
One paragraph. Soft-wrap it however you like — the lines are joined.

## Skills
Languages: Python, Go, TypeScript
Backend: PostgreSQL, Redis, Kafka

## Experience
### [Northwind Systems](https://northwind.example) | March 2023 – Present
Senior Software Engineer | Remote
- Cut checkout p95 latency from 840ms to 310ms by adding read replicas,
  lifting conversion 4% on mobile.
Tech: Go, PostgreSQL, Redis

## Projects
### [Ledgerly](https://ledgerly.example) | 2023 – Present · ledgerly.example
- Self-hosted expense tracker used daily by 200+ people.
Tech: Python, SQLite

## Education
### [Northgate University](https://northgate.example) | 2022
M.Sc. Software Engineering
```

## The entry grammar

Experience, Projects and Education all share one shape. Learn it once:

| Line | Becomes |
|---|---|
| `### <left> \| <right>` | The **bold row** — left text and right text |
| the next plain line | The **sub row** — `<left> \| <right>`, both optional |
| `- …` | A bullet |
| an **indented** line | A continuation of the bullet above it |
| `Tech: a, b, c` | The chips under the entry |

What each column means per section:

| Section | Bold row left | Bold row right | Sub row left | Sub row right |
|---|---|---|---|---|
| Experience | Company | Date range | Job title | Location |
| Projects | Project name | Period `·` link | Description | — |
| Education | Institution | Year or range | Degree | — |

### Links

Any entry title may be a markdown link, which is what makes the **company name
itself clickable**:

```markdown
### [Northwind Systems](https://northwind.example) | March 2023 – Present
```

The link is optional — `### Northwind Systems | March 2023 – Present` renders as
plain bold text. Links stay clickable in the exported PDF.

### Dates

Written as `<start> – <end>`, separated by an en dash, em dash, hyphen or `to`.
Each side may be `March 2023`, `2023`, or `Present`. A bare year widens to the
edge of that year — January for a start, December for an end — so `2012 – 2016`
covers the whole period.

Dates are checked; see [Report](#report) below.

## Header

```markdown
# Jordan Avery
Software Engineer
Bristol, United Kingdom | +44 7700 900123
jordan.avery@example.com
```

- `#` is the name.
- The first plain line with no email/phone/URL in it is the **job title**. The
  `</ … >` decoration around it comes from the stylesheet, so don't type it.
- Every line after that is a **contact row**, rendered right-aligned on its own
  line. Tokens within a row split on `|`, `·` or `•`.
- Each token is classified automatically to pick its icon: email, phone,
  `linkedin.com/…`, `github.com/…`, any other URL (globe), or anything else
  (location pin).

There is no separate website row in the reference layout — GitHub serves as the
site — but any other URL is supported and gets a globe icon.

## Skills

One line per line. Not bullets, not nested:

```markdown
Languages: Python, Go, TypeScript
Backend: PostgreSQL, Redis, Kafka
```

The part before the first colon is the category label. It renders in a fixed
gutter down the left edge — small, uppercase and letterspaced by the stylesheet,
so type it in whatever case reads best in the source — and the values get a
column of their own beside it, wrapping within that column. The colon separates
the two and is never printed. A line with no colon has no label and spans the
full width. A leading `- ` is tolerated if you're in the habit.

Certifications are written the same way but render differently: they read as
statements rather than as a category index, so they keep a bold run-in label on
one flowing line.

## Sections

`##` headings are matched case-insensitively, with aliases:

| Section | Also accepted |
|---|---|
| Summary | Profile, About |
| Skills | Technical Skills, Core Skills |
| Experience | Work Experience, Employment, Professional Experience |
| Projects | Personal Projects, Selected Projects |
| Education | — |
| Certifications | Certificates, Licenses, Licences |

**Order follows your markdown.** Whatever order the `##` headings appear in is
the order they render, so moving a section is an edit here, never a code change.
An unrecognised heading is skipped and reported.

## Spacing and page breaks

Long entries flow across pages on their own, splitting between bullets — a header
is never stranded and a bullet is never cut in half. Two controls override that:

- **An extra blank line before an entry adds a step of space.** One blank line is
  the norm and means nothing; each further one adds a step, up to three.
- **A `---` line forces a new page.** Put it before a `###` to move one entry, or
  before a `##` to move a whole section.

```markdown
### Northwind Systems | 2023 – Present
Engineer | Remote
- Did a thing.


### Harbour Analytics | 2021 – 2023   ← one extra blank line = one step of space
Engineer | Bristol, UK
- Did another thing.

---

### Bramble & Co | 2016 – 2020        ← starts a new page
```

The `---` at the very top of a file is front matter, not a page break.

## Front matter

Optional, and only two keys:

```markdown
---
projects: true
chips: true
---
```

- `projects: false` — drop the whole Projects section while keeping its content
  in the file.
- `chips: false` — drop the `Tech:` chips everywhere.

`--no-projects` and `--no-chips` on the command line override both.

## Inline formatting

Inside bullets, the summary and descriptions: `**bold**`, `*italic*`,
`` `code` ``, `[text](url)`, and bare URLs (auto-linked). Everything is HTML
escaped first, so `&`, `<` and `>` are safe to type.

## Report

`render.py` writes `output/cv_report.json` next to the CV. It checks dates and
completeness — see the [README](README.md#report) for the full table. Nothing in
it changes the rendered CV.

---

## How the shipped template exercises the style guide

`input/cv.template.md` is a worked example of
[docs/resume-best-practices.md](../docs/resume-best-practices.md). Each entry
demonstrates a different pattern from the guide, so the file teaches the format
and the writing standard at once:

| Entry | Demonstrates |
|---|---|
| Northwind Systems | **XYZ** — "Accomplished X, as measured by Y, by doing Z" |
| Harbour Analytics | **STAR** — situation, task, action, result (the first bullet) |
| Kestrel Software | **CAR** — challenge, action, result (the first bullet) |
| Tessellate Labs | Past-tense action verbs and quantified impact throughout |
| Bramble & Co | An entry with **no company link and no `Tech:` line** |

The three projects each clear the guide's "real project" bar — solves a problem,
has users, actively maintained — and Cadence deliberately carries no link or
period, to cover that branch.

---

## The in-app guide

The Guide tab in Kite covers all of the above with copyable examples beside your
editor, and every example in it is verified by the test suite. This file is the
reference; the Guide is the version to read while writing.
