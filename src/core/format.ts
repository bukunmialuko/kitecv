/**
 * Tidy CV markdown without changing what it says.
 *
 * A general markdown formatter would ruin this format, because here whitespace
 * is not free: the blank lines before an entry are a spacing step and a lone
 * `---` is a page break. So this one walks the document the way `parse.ts` does,
 * re-emitting it in canonical shape — one blank line above a `##`, entry bodies
 * packed tight, ` | ` around the column split, `- ` bullets, two-space
 * continuations — while preserving every count that carries meaning.
 *
 * The promise, pinned by `format.test.ts`: reparsing formatted markdown gives
 * back the same `Cv`. One change is allowed through to the page — a date range
 * is re-emitted with an en dash, which is what Experience already prints and
 * what Education and Projects, which print their column verbatim, should.
 *
 * Prose is left alone. Every character of the Summary, Skills and Certifications
 * lines is printed, so the formatter touches nothing in them but the
 * indentation and blank lines the parser was going to discard anyway.
 */
import {
  BULLET_RE,
  ENTRY_SECTIONS,
  FRONT_MATTER_RE,
  MAX_SPACING,
  PAGE_BREAK_RE,
  sectionKeyFor,
  splitDateRange,
  splitLink,
  TECH_RE,
} from "./parse";
import type { SectionKey } from "./types";

/** The canonical spelling of each accepted chip keyword. */
const TECH_KEYWORDS: Record<string, string> = {
  tech: "Tech",
  technologies: "Technologies",
  stack: "Stack",
};

/**
 * A range is only rewritten when both sides really are dates. Without this,
 * `### Consultant | Remote - Contract` would come back as an en dash too: the
 * range splitter is deliberately loose, and the formatter is the one place that
 * has to be sure before it rewrites.
 */
const DATEISH_RE = /^(?:present|current|now|ongoing|\d{4}|\d{1,2}\/\d{4}|[a-z]{3,9}\.?\s+\d{4})$/i;

/** Separates a project's period from its address, and one contact from another. */
const DOT_SPLIT_RE = /\s*[·•]\s*/;

/** Contact rows are split and trimmed by the parser, so their spacing is ours. */
const SEPARATOR_RE = /\s*([|·•])\s*/g;

/** The blank lines before an entry, at the point where more stop counting. */
const MAX_GAP = MAX_SPACING + 1;

/** Re-join a piped row. The pipe stays when the left half is empty — dropping it
 * would move the right half into the left column. */
function joinPipe(left: string, right: string): string {
  if (left && right) return `${left} | ${right}`;
  if (right) return `| ${right}`;
  return left;
}

/** Split on the first pipe, as the parser does. */
function splitPipe(text: string): [string, string] {
  const at = text.indexOf("|");
  if (at === -1) return [text.trim(), ""];
  return [text.slice(0, at).trim(), text.slice(at + 1).trim()];
}

/** Normalise a date range to `start – end`. */
function normalizeRange(text: string): string {
  const value = text.trim();
  const [start, end] = splitDateRange(value);
  if (!end || !DATEISH_RE.test(start) || !DATEISH_RE.test(end)) return value;
  return `${start} – ${end}`;
}

/**
 * The right-hand column: a date range, or "range · address" on a project.
 *
 * Exported because `format.test.ts` uses it to state the one exception to
 * parse-preservation, rather than restating the rule and letting the two drift.
 */
export function formatColumn(right: string): string {
  return right
    .split(DOT_SPLIT_RE)
    .map(normalizeRange)
    .filter(Boolean)
    .join(" · ");
}

function formatEntryHead(rest: string): string {
  const [titlePart, right] = splitPipe(rest);
  const [text, url] = splitLink(titlePart);
  return joinPipe(url ? `[${text}](${url})` : text, formatColumn(right));
}

function formatTech(stripped: string): string {
  const at = stripped.indexOf(":");
  const keyword = stripped.slice(0, at).trim().toLowerCase();
  const items = stripped
    .slice(at + 1)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return `${TECH_KEYWORDS[keyword] ?? "Tech"}: ${items.join(", ")}`;
}

function formatFrontMatter(block: string): string {
  const lines: string[] = [];
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const at = line.indexOf(":");
    // Comments and anything that is not `key: value` are inert to the parser,
    // so they are kept as typed rather than quietly deleted.
    if (line.startsWith("#") || at === -1) lines.push(line);
    else lines.push(`${line.slice(0, at).trim()}: ${line.slice(at + 1).trim()}`);
  }
  return lines.length ? `---\n${lines.join("\n")}\n---\n` : "";
}

const SPACE_RE = /\s/;

/**
 * Where a caret sitting at `at` in `text` lands once the text is `formatted`.
 *
 * Measured in non-whitespace characters, because those are the one thing
 * formatting cannot move: it rewrites the space between words, never the words.
 * Counting them instead of offsets is what keeps the caret under the same letter
 * when the lines around it shift.
 */
export function mapCaret(text: string, formatted: string, at: number): number {
  // Past the last word there is no letter left to anchor to, so the end of the
  // document is the anchor: a caret in the trailing blank lines stays there.
  if (!text.slice(at).trim()) return formatted.length;

  let ink = 0;
  for (let i = 0; i < at && i < text.length; i += 1) if (!SPACE_RE.test(text[i])) ink += 1;
  if (ink === 0) return 0;

  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (SPACE_RE.test(formatted[i])) continue;
    seen += 1;
    if (seen === ink) return i + 1;
  }
  return formatted.length;
}

/** Rewrite CV markdown in canonical form. Idempotent. */
export function formatMarkdown(text: string): string {
  const source = text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  const front = FRONT_MATTER_RE.exec(source);
  const body = front ? source.slice(front[0].length) : source;

  const out: string[] = [];
  let blanks = 0;
  let pendingBreak = false;
  let section: SectionKey | null = null;
  let entries = 0;
  let inEntry = false;
  let hasSub = false;
  let hasBullets = false;

  const push = (line: string, gap: number): void => {
    if (out.length) for (let i = 0; i < gap; i += 1) out.push("");
    out.push(line.trimEnd());
    blanks = 0;
  };

  /** A page break sits alone with air either side. Before any content it means
   * nothing — the parser drops it — so it is dropped here too. */
  const pushBreak = (): void => {
    if (out.length) push("---", 1);
    pendingBreak = false;
  };

  for (const raw of body.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const stripped = line.trim();

    if (!stripped) {
      blanks += 1;
      continue;
    }

    if (PAGE_BREAK_RE.test(stripped)) {
      pendingBreak = true;
      // Blank lines before a break are invisible to the parser; the ones after
      // it are the spacing step.
      blanks = 0;
      continue;
    }

    if (stripped.startsWith("## ")) {
      if (pendingBreak) pushBreak();
      const heading = stripped.slice(3).trim();
      push(`## ${heading}`, 1);
      section = sectionKeyFor(heading);
      entries = 0;
      inEntry = false;
      continue;
    }

    const entrySection = section !== null && ENTRY_SECTIONS.includes(section);

    if (entrySection && stripped.startsWith("### ")) {
      // One blank line is the norm and means nothing; each further one is a step
      // of space, so the count is preserved rather than collapsed. Blanks above
      // the first entry sit under the section heading and are ignored.
      const gap =
        entries === 0
          ? Number(pendingBreak)
          : Math.min(MAX_GAP, Math.max(1, blanks));
      if (pendingBreak) pushBreak();
      push(`### ${formatEntryHead(stripped.slice(4))}`, gap);
      entries += 1;
      inEntry = true;
      hasSub = false;
      hasBullets = false;
      continue;
    }

    if (inEntry) {
      // Blank lines inside an entry mean nothing to the parser, so the body is
      // packed: every line below lands with no gap.
      const bullet = BULLET_RE.exec(stripped);
      if (bullet) {
        push(`- ${bullet[1].trim()}`, 0);
        hasBullets = true;
        continue;
      }
      if (TECH_RE.test(stripped)) {
        push(formatTech(stripped), 0);
        continue;
      }
      if (/^\s/.test(line) && (hasBullets || hasSub)) {
        push(`  ${stripped}`, 0);
        continue;
      }
      if (!hasSub && !hasBullets) {
        const [left, right] = splitPipe(stripped);
        push(joinPipe(left, right), 0);
        hasSub = left !== "";
        continue;
      }
      // The parser will report this line and drop it. Reformatting it would be
      // guessing at what was meant; Analysis says so instead.
      push(stripped, 0);
      continue;
    }

    // Outside an entry section a `---` is content the parser reads in place, so
    // it is flushed here. Inside one it always lands on the next `###`, which is
    // where the branch above emits it.
    if (pendingBreak && !entrySection) pushBreak();

    // Everything before the first `##` — and everything under a heading the
    // parser does not know — is read as header lines.
    if (section === null) {
      push(
        stripped.startsWith("# ")
          ? `# ${stripped.slice(2).trim()}`
          : stripped.replace(SEPARATOR_RE, " $1 ").trim(),
        blanks ? 1 : 0,
      );
      continue;
    }

    push(stripped, blanks ? 1 : 0);
  }

  // A trailing break has no entry to land on, so the parser ignores it — but it
  // is a line the author typed, and deleting it is not the formatter's call.
  if (pendingBreak) pushBreak();

  const rest = out.join("\n").trimEnd();
  const head = front ? formatFrontMatter(front[1]) : "";
  if (!rest) return head;
  return head ? `${head}\n${rest}\n` : `${rest}\n`;
}
