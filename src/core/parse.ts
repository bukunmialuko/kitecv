/**
 * Parse a CV written in the Kite markdown format into a `Cv`.
 *
 * The grammar lives in CV-FORMAT.md. One uniform entry shape is shared by
 * Experience, Projects and Education:
 *
 *     ### <title> | <right>       -> bold row   (title may be a [text](url) link)
 *     <sub-left> | <sub-right>    -> plain sub-row (optional)
 *     - bullet                    -> highlights
 *     Tech: a, b, c               -> chips
 *
 * Nothing here emits HTML — escaping and inline markdown are render.ts's job, so
 * the object keeps the author's raw text.
 */
import type {
  Contact,
  ContactItem,
  ContactKind,
  Cv,
  CvOptions,
  Education,
  Experience,
  Finding,
  ParseResult,
  Project,
  SectionKey,
} from "./types";

/** `##` headings are matched case-insensitively against these. */
const SECTION_ALIASES: Record<SectionKey, string[]> = {
  summary: ["summary", "profile", "about"],
  skills: ["skills", "technical skills", "core skills"],
  experience: [
    "experience",
    "work experience",
    "employment",
    "professional experience",
  ],
  projects: ["projects", "personal projects", "selected projects"],
  education: ["education"],
  certifications: ["certifications", "certificates", "licenses", "licences"],
};

const ALIAS_TO_KEY = new Map<string, SectionKey>();
for (const [key, names] of Object.entries(SECTION_ALIASES)) {
  for (const name of names) ALIAS_TO_KEY.set(name, key as SectionKey);
}

/** Resolve a `##` heading to its section key, or null if it is not one we know. */
export function sectionKeyFor(heading: string): SectionKey | null {
  return ALIAS_TO_KEY.get(heading.trim().toLowerCase()) ?? null;
}

/*
 * The grammar below is exported for `format.ts`, which has to recognise exactly
 * what this file recognises — a formatter working from its own idea of the
 * format would eventually reshape a line into something the parser reads
 * differently. One definition, two readers.
 */

export const ENTRY_SECTIONS: SectionKey[] = ["experience", "projects", "education"];

const MD_LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)\s*$/;
export const TECH_RE = /^(?:tech|technologies|stack)\s*:\s*(.+)$/i;
export const BULLET_RE = /^[-*]\s+(.+)$/;
const PHONE_RE = /^[+(]?\d[\d\s()\-.]{5,}$/;
const DOMAIN_RE = /^(?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?$/i;

/**
 * Splits "March 2023 – Present". Spaced separators are tried first so a
 * hyphenated month name or title can't be mistaken for one.
 */
const RANGE_SPACED_RE = /\s+(?:[–—]|-{1,2}|to)\s+/i;
const RANGE_TIGHT_RE = /^(\d{4})\s*[–—-]\s*(.+)$/;

const CONTACT_SPLIT_RE = /\s*[|·•]\s*/;

/** A `---` line on its own forces whatever follows onto a new page. */
export const PAGE_BREAK_RE = /^-{3,}$/;

/**
 * One blank line between entries is the norm and means nothing; each further
 * blank adds a step of space. Capped so a stray run of newlines cannot blow a
 * page apart.
 */
export const MAX_SPACING = 3;

function finding(
  type: string,
  message: string,
  section: string | null = null,
  index: number | null = null,
): Finding {
  return { category: "structure", type, severity: "warning", section, index, message };
}

/** The leading `--- … ---` block, captured whole so `format.ts` can re-emit it. */
export const FRONT_MATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;

/**
 * Split a leading `--- key: value ---` block off the document.
 *
 * Deliberately not YAML — a handful of scalar keys is all the format needs, and
 * a dependency for that would not pay for itself.
 */
export function parseFrontMatter(text: string): { options: CvOptions; body: string } {
  const options: CvOptions = {};
  const match = FRONT_MATTER_RE.exec(text);
  if (!match) return { options, body: text };

  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes(":")) continue;
    const at = line.indexOf(":");
    const key = line.slice(0, at).trim().toLowerCase();
    const value = line.slice(at + 1).trim().replace(/^["']|["']$/g, "");
    const low = value.toLowerCase();
    if (["true", "yes", "on"].includes(low)) options[key] = true;
    else if (["false", "no", "off"].includes(low)) options[key] = false;
    else options[key] = value;
  }
  return { options, body: text.slice(match[0].length) };
}

/** Pull `[Company](https://…)` apart into ["Company", "https://…"]. */
export function splitLink(text: string): [string, string] {
  const match = MD_LINK_RE.exec(text.trim());
  if (match) return [match[1].trim(), match[2].trim()];
  return [text.trim(), ""];
}

/** Split "March 2023 – Present" into ["March 2023", "Present"]. */
export function splitDateRange(value: string): [string, string] {
  const text = (value ?? "").trim();
  if (!text) return ["", ""];

  const spaced = text.split(RANGE_SPACED_RE);
  if (spaced.length >= 2) {
    return [spaced[0].trim(), spaced.slice(1).join(" ").trim()];
  }
  const tight = RANGE_TIGHT_RE.exec(text);
  if (tight) return [tight[1].trim(), tight[2].trim()];
  return [text, ""];
}

/**
 * Work out what a contact token is, so the renderer can pick its icon.
 *
 * Order matters: email before domain (an address contains a dot too), and phone
 * before domain (a number is not a hostname).
 */
export function classifyContact(token: string): ContactItem {
  const text = token.trim();
  const lowered = text.toLowerCase();

  if (text.includes("@") && !text.includes(" ")) {
    return { kind: "email", text, href: `mailto:${text}` };
  }
  if (PHONE_RE.test(text)) {
    return { kind: "phone", text, href: `tel:${text.replace(/[^\d+]/g, "")}` };
  }
  if (DOMAIN_RE.test(text)) {
    const href = lowered.startsWith("http") ? text : `https://${text}`;
    let kind: ContactKind = "link";
    if (lowered.includes("linkedin.com")) kind = "linkedin";
    else if (lowered.includes("github.com")) kind = "github";
    return { kind, text, href };
  }
  return { kind: "location", text, href: "" };
}

/** Read the block above the first `##`: name, job title, contact rows. */
function parseHeader(lines: string[]): { name: string; title: string; contact: Contact } {
  const contact: Contact = {
    email: "",
    phone: "",
    location: "",
    links: [],
    rows: [],
  };
  let name = "";
  let title = "";

  const body: string[] = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue;
    if (stripped.startsWith("# ")) name = stripped.slice(2).trim();
    else body.push(stripped);
  }

  // The first non-contact line after the name is the job title; everything that
  // follows is a contact row. A line counts as contact if any token in it looks
  // like an email, phone or URL.
  for (const line of body) {
    const tokens = line.split(CONTACT_SPLIT_RE).filter((t) => t.trim());
    const classified = tokens.map(classifyContact);
    const isContact = classified.some((c) => c.kind !== "location");

    if (!isContact && !title) {
      title = line;
      continue;
    }
    contact.rows.push(classified);
    for (const item of classified) {
      if (item.kind === "email" && !contact.email) contact.email = item.text;
      else if (item.kind === "phone" && !contact.phone) contact.phone = item.text;
      else if (item.kind === "location" && !contact.location) contact.location = item.text;
      else if (item.kind === "linkedin" || item.kind === "github" || item.kind === "link") {
        contact.links.push(item.text);
      }
    }
  }
  return { name, title, contact };
}

interface RawEntry {
  title: string;
  url: string;
  right: string;
  subLeft: string;
  subRight: string;
  highlights: string[];
  technologies: string[];
  spacing: number;
  pageBreak: boolean;
}

/** Turn a section body into the shared entry shape. */
function parseEntries(lines: string[], section: string, findings: Finding[]): RawEntry[] {
  const entries: RawEntry[] = [];
  let current: RawEntry | null = null;
  let blanks = 0;
  let pageBreak = false;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      blanks += 1;
      continue;
    }

    if (PAGE_BREAK_RE.test(stripped)) {
      pageBreak = true;
      blanks = 0;
      continue;
    }

    if (stripped.startsWith("### ")) {
      const rest = stripped.slice(4);
      const at = rest.indexOf("|");
      const titlePart = at === -1 ? rest : rest.slice(0, at);
      const right = at === -1 ? "" : rest.slice(at + 1);
      const [text, url] = splitLink(titlePart);
      if (!text) {
        findings.push(
          finding("unparseable_entry", `Entry heading has no title: ${stripped}`, section, entries.length),
        );
      }
      current = {
        title: text,
        url,
        right: right.trim(),
        subLeft: "",
        subRight: "",
        highlights: [],
        technologies: [],
        // Blank lines before the *first* entry sit under the section heading, so
        // they are ignored — otherwise invisible whitespace would shift the gap
        // below `## Experience`.
        spacing: entries.length === 0 ? 0 : Math.min(MAX_SPACING, Math.max(0, blanks - 1)),
        pageBreak,
      };
      entries.push(current);
      blanks = 0;
      pageBreak = false;
      continue;
    }

    if (!current) {
      // Text before the first `###` is dropped, but the author should hear about
      // it rather than wonder where it went.
      findings.push(finding("orphan_text", `Ignored text before the first entry: ${stripped}`, section));
      continue;
    }

    blanks = 0;

    const bullet = BULLET_RE.exec(stripped);
    if (bullet) {
      current.highlights.push(bullet[1].trim());
      continue;
    }

    const tech = TECH_RE.exec(stripped);
    if (tech) {
      current.technologies = tech[1].split(",").map((p) => p.trim()).filter(Boolean);
      continue;
    }

    // An indented line continues whatever came before it, so a bullet can wrap
    // across several source lines and still read well at 80 columns. Bullets and
    // `Tech:` are matched above on the stripped text, so a wholly indented list
    // still works — only genuine continuations reach here.
    if (/^\s/.test(line)) {
      if (current.highlights.length) {
        current.highlights[current.highlights.length - 1] += ` ${stripped}`;
        continue;
      }
      if (current.subLeft) {
        current.subLeft += ` ${stripped}`;
        continue;
      }
    }

    // The one remaining plain line is the sub-row, and only the first counts.
    if (!current.subLeft && !current.highlights.length) {
      const at = stripped.indexOf("|");
      current.subLeft = (at === -1 ? stripped : stripped.slice(0, at)).trim();
      current.subRight = at === -1 ? "" : stripped.slice(at + 1).trim();
    } else {
      findings.push(
        finding("unexpected_line", `Ignored unrecognised line: ${stripped}`, section, entries.length - 1),
      );
    }
  }
  return entries;
}

function toExperience(entry: RawEntry): Experience {
  const [start, end] = splitDateRange(entry.right);
  return {
    company: entry.title,
    url: entry.url,
    role: entry.subLeft,
    location: entry.subRight,
    start,
    end,
    highlights: entry.highlights,
    technologies: entry.technologies,
    spacing: entry.spacing,
    pageBreak: entry.pageBreak,
  };
}

function toProject(entry: RawEntry): Project {
  // The right-hand side carries a period, a link, or "period · link".
  let period = "";
  let link = "";
  for (const part of entry.right.split(/\s*[·•]\s*/).map((p) => p.trim()).filter(Boolean)) {
    if (DOMAIN_RE.test(part) && !link) link = part;
    else if (!period) period = part;
  }
  const [start, end] = splitDateRange(period);
  return {
    name: entry.title,
    url: entry.url,
    period,
    link,
    start,
    end,
    description: entry.subLeft,
    highlights: entry.highlights,
    technologies: entry.technologies,
    spacing: entry.spacing,
    pageBreak: entry.pageBreak,
  };
}

function toEducation(entry: RawEntry): Education {
  let degree = entry.subLeft;
  let field = "";
  const match = /^(.*?)\s+in\s+(.*)$/i.exec(entry.subLeft);
  if (match) {
    degree = match[1].trim();
    field = match[2].trim();
  }
  const [start, end] = splitDateRange(entry.right);
  return {
    institution: entry.title,
    url: entry.url,
    degree,
    field,
    year: entry.right,
    start,
    end,
    highlights: entry.highlights,
    technologies: entry.technologies,
    spacing: entry.spacing,
    pageBreak: entry.pageBreak,
  };
}

function emptyCv(): Cv {
  return {
    name: "",
    title: "",
    contact: { email: "", phone: "", location: "", links: [], rows: [] },
    summary: "",
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    sectionOrder: [],
    sectionBreaks: [],
  };
}

/** Strip a leading `- ` if the author is in the habit, otherwise keep the line. */
function plainLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue;
    const bullet = BULLET_RE.exec(stripped);
    out.push(bullet ? bullet[1].trim() : stripped);
  }
  return out;
}

/**
 * Parse the CV markdown.
 *
 * Returns the `Cv`, the front-matter options, and any structural complaints
 * worth surfacing to the author.
 */
export function parseCv(text: string): ParseResult {
  const findings: Finding[] = [];
  const { options, body } = parseFrontMatter(text);

  // Split into the header block plus one bucket per `##` heading, remembering
  // the order they appeared in — the renderer follows the document, not a
  // hardcoded list.
  const headerLines: string[] = [];
  const sections = new Map<SectionKey, string[]>();
  const order: SectionKey[] = [];
  const sectionBreaks: SectionKey[] = [];
  let currentKey: SectionKey | null = null;

  // A `---` is held rather than dispatched immediately: if a `##` heading comes
  // next it breaks the page before that whole section, otherwise it belongs to
  // the section body and `parseEntries` attaches it to the next entry.
  let pendingBreak = false;
  const flushBreak = () => {
    if (!pendingBreak) return;
    if (currentKey !== null) sections.get(currentKey)!.push("---");
    pendingBreak = false;
  };

  for (const raw of body.split(/\r?\n/)) {
    const stripped = raw.trim();

    if (PAGE_BREAK_RE.test(stripped)) {
      flushBreak();
      pendingBreak = true;
      continue;
    }

    if (stripped.startsWith("## ")) {
      const heading = stripped.slice(3).trim();
      const key = sectionKeyFor(heading);
      if (!key) {
        findings.push(finding("unknown_section", `Ignored unrecognised section heading: ${heading}`));
        currentKey = null;
        pendingBreak = false;
        continue;
      }
      currentKey = key;
      if (!sections.has(key)) {
        sections.set(key, []);
        order.push(key);
      }
      if (pendingBreak) {
        if (!sectionBreaks.includes(key)) sectionBreaks.push(key);
        pendingBreak = false;
      }
      continue;
    }
    if (stripped) flushBreak();
    if (currentKey === null) headerLines.push(raw);
    else sections.get(currentKey)!.push(raw);
  }
  flushBreak();

  const header = parseHeader(headerLines);
  const data: Cv = { ...emptyCv(), ...header, sectionOrder: order, sectionBreaks };

  for (const key of order) {
    const lines = sections.get(key)!;
    if (key === "summary") {
      data.summary = lines.map((l) => l.trim()).filter(Boolean).join(" ").trim();
    } else if (key === "skills") {
      data.skills = plainLines(lines);
    } else if (key === "certifications") {
      data.certifications = plainLines(lines);
    } else if (ENTRY_SECTIONS.includes(key)) {
      const entries = parseEntries(lines, key, findings);
      if (key === "experience") data.experience = entries.map(toExperience);
      else if (key === "projects") data.projects = entries.map(toProject);
      else data.education = entries.map(toEducation);
    }
  }

  return { data, options, findings };
}
