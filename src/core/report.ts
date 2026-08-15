/**
 * Deterministic checks over a parsed CV: date logic and completeness.
 *
 * This never touches the rendered CV — it is a separate analysis pass. The
 * findings are deliberately machine-readable so a future tool (a VS Code
 * extension, or a PDF importer) can turn the `missing` ones into questions.
 */
import type {
  Cv,
  Education,
  Experience,
  Finding,
  FindingCategory,
  Project,
  Report,
  Severity,
  TimelineEntry,
} from "./types";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const ONGOING = ["present", "current", "now", "ongoing", "date"];

/** A gap shorter than this is normal between jobs and not worth flagging. */
const GAP_THRESHOLD_MONTHS = 3;

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

type Ym = [number, number];
type DatedEntry = Experience | Project | Education;

function finding(
  category: FindingCategory,
  type: string,
  message: string,
  severity: Severity,
  section: string | null = null,
  index: number | null = null,
): Finding {
  return { category, type, severity, section, index, message };
}

/**
 * Parse "December 2024", "2017" or "Present" into a [year, month] pair.
 *
 * A bare year widens to the edges of that year — January for a start, December
 * for an end — so "2012 – 2017" spans the whole period the author meant.
 *
 * `today` is a parameter, not `new Date()`, because `Present` resolves against
 * it. Without injection every test here would rot as real time passes.
 */
export function parseMonthYear(value: string, isEnd = false, today = new Date()): Ym | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (ONGOING.includes(text.toLowerCase().replace(/\.$/, ""))) {
    return [today.getFullYear(), today.getMonth() + 1];
  }

  const yearMatch = /(19|20)\d{2}/.exec(text);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);

  let month: number | null = null;
  const word = /[A-Za-z]{3,}/.exec(text);
  if (word) month = MONTHS[word[0].slice(0, 3).toLowerCase()] ?? null;
  if (month === null) {
    const numeric = /^\s*(\d{1,2})[/-](\d{4})\s*$/.exec(text);
    if (numeric) month = Number(numeric[1]);
  }
  if (month === null) month = isEnd ? 12 : 1;
  return [year, month];
}

function monthsBetween(start: Ym, end: Ym): number {
  return (end[0] - start[0]) * 12 + (end[1] - start[1]);
}

function label(section: string, entry: DatedEntry): string {
  if (section === "experience") {
    const e = entry as Experience;
    return e.company || e.role || "(untitled)";
  }
  if (section === "education") {
    const e = entry as Education;
    return e.institution || e.degree || "(untitled)";
  }
  return (entry as Project).name || "(untitled)";
}

/** Total months covered, merging overlaps so concurrent roles aren't double-counted. */
function totalMonths(spans: Array<[Ym, Ym]>): number {
  if (!spans.length) return 0;
  // Ascending by start, so the merge can sweep forward in one pass.
  const ordered = [...spans].sort((a, b) => monthsBetween(b[0], a[0]));
  const merged: Array<{ start: Ym; end: Ym }> = [
    { start: ordered[0][0], end: ordered[0][1] },
  ];

  for (const [start, end] of ordered.slice(1)) {
    const last = merged[merged.length - 1];
    if (monthsBetween(last.end, start) <= 0) {
      if (monthsBetween(last.end, end) > 0) last.end = end;
    } else {
      merged.push({ start, end });
    }
  }
  // +1 because a role running Jan–Jan is one month of work, not zero.
  return merged.reduce((sum, s) => sum + monthsBetween(s.start, s.end) + 1, 0);
}

function entriesFor(cv: Cv, section: string): DatedEntry[] {
  if (section === "experience") return cv.experience;
  if (section === "projects") return cv.projects;
  if (section === "education") return cv.education;
  return [];
}

/** Range checks for one section; returns its parsed spans. */
function checkDates(
  cv: Cv,
  section: string,
  today: Date,
  findings: Finding[],
  entriesOut: TimelineEntry[],
): Array<[Ym, Ym]> {
  const spans: Array<[Ym, Ym]> = [];

  entriesFor(cv, section).forEach((entry, index) => {
    const rawStart = entry.start || "";
    const rawEnd = entry.end || "";
    const name = label(section, entry);

    const start = parseMonthYear(rawStart, false, today);
    const end = rawEnd ? parseMonthYear(rawEnd, true, today) : start;

    if (rawStart && start === null) {
      findings.push(finding("timeline", "unparseable",
        `${name}: could not read the start date "${rawStart}"`, "error", section, index));
    }
    if (rawEnd && end === null) {
      findings.push(finding("timeline", "unparseable",
        `${name}: could not read the end date "${rawEnd}"`, "error", section, index));
    }
    if (start && end && monthsBetween(start, end) < 0) {
      findings.push(finding("timeline", "end_before_start",
        `${name}: ends ${rawEnd} before it starts ${rawStart} — the dates are the wrong way round`,
        "error", section, index));
    }
    if (start && (start[0] > today.getFullYear() ||
      (start[0] === today.getFullYear() && start[1] > today.getMonth() + 1))) {
      findings.push(finding("timeline", "future_start",
        `${name}: starts ${rawStart}, which is in the future`, "warning", section, index));
    }

    entriesOut.push({
      section,
      index,
      label: name,
      start: rawStart,
      end: rawEnd,
      startYm: start,
      endYm: end,
      months: start && end ? monthsBetween(start, end) + 1 : null,
    });

    if (start && end && monthsBetween(start, end) >= 0) spans.push([start, end]);
  });

  return spans;
}

/** Entries should read newest-first; flag any that don't. */
function checkOrder(cv: Cv, section: string, today: Date, findings: Finding[]): void {
  let previous: [string, Ym] | null = null;
  entriesFor(cv, section).forEach((entry, index) => {
    const start = parseMonthYear(entry.start || "", false, today);
    if (!start) return;
    if (previous && monthsBetween(previous[1], start) > 0) {
      findings.push(finding("timeline", "out_of_order",
        `${label(section, entry)} starts ${entry.start}, later than "${previous[0]}" above it — entries should run newest first`,
        "warning", section, index));
    }
    previous = [label(section, entry), start];
  });
}

/**
 * Gaps and overlaps between roles, computed newest-first.
 *
 * Sorted rather than taken in document order, so an out-of-order CV reports the
 * ordering problem once instead of also inventing phantom gaps.
 */
function checkGaps(cv: Cv, today: Date, findings: Finding[]): void {
  const spans: Array<{ start: Ym; end: Ym; label: string; index: number }> = [];
  cv.experience.forEach((entry, index) => {
    const start = parseMonthYear(entry.start || "", false, today);
    const end = entry.end ? parseMonthYear(entry.end, true, today) : start;
    if (start && end && monthsBetween(start, end) >= 0) {
      spans.push({ start, end, label: label("experience", entry), index });
    }
  });
  spans.sort((a, b) => monthsBetween(a.start, b.start));

  for (let i = 0; i < spans.length - 1; i++) {
    const newer = spans[i];
    const older = spans[i + 1];
    const gap = monthsBetween(older.end, newer.start) - 1;
    if (gap >= GAP_THRESHOLD_MONTHS) {
      findings.push(finding("timeline", "gap",
        `${gap}-month gap between ${older.label} ending and ${newer.label} starting`,
        "warning", "experience", newer.index));
    } else if (monthsBetween(newer.start, older.end) > 0) {
      findings.push(finding("timeline", "overlap",
        `${newer.label} overlaps ${older.label} — concurrent roles, usually fine`,
        "info", "experience", newer.index));
    }
  }
}

/** Completeness gaps — the half a future importer turns into questions. */
function checkMissing(cv: Cv, findings: Finding[]): void {
  if (!cv.name.trim()) {
    findings.push(finding("missing", "missing_name",
      "No name — the `# Name` heading is empty or absent", "warning"));
  }
  if (!cv.contact.email.trim()) {
    findings.push(finding("missing", "missing_email", "No email address in the contact block", "warning"));
  }
  if (!cv.summary.trim()) {
    findings.push(finding("missing", "missing_summary", "No summary section", "warning"));
  }
  if (!cv.skills.length) {
    findings.push(finding("missing", "missing_skills", "No skills listed", "warning"));
  }

  for (const section of cv.sectionOrder) {
    if (section === "summary" || section === "skills" || section === "certifications") continue;
    const entries = entriesFor(cv, section);
    if (!entries.length) {
      findings.push(finding("missing", "empty_section",
        `The ${section} section is present but has no entries`, "warning", section));
      continue;
    }
    entries.forEach((entry, index) => {
      const name = label(section, entry);
      // Education is exempt: a degree line legitimately carries no bullets, so
      // flagging it would train the reader to ignore the report.
      if (section !== "education" && !entry.highlights.length) {
        findings.push(finding("missing", "entry_no_bullets",
          `${name} has no bullet points`, "warning", section, index));
      }
      // Projects may legitimately carry no period, so only the dated sections
      // are checked here.
      if ((section === "experience" || section === "education") && !(entry.start || "").trim()) {
        findings.push(finding("missing", "entry_no_dates", `${name} has no dates`, "warning", section, index));
      }
    });
  }
}

/** Run every check and return the report payload. */
export function buildReport(cv: Cv, extra: Finding[] = [], today = new Date()): Report {
  const findings: Finding[] = [...extra];
  const entries: TimelineEntry[] = [];

  const experienceSpans = checkDates(cv, "experience", today, findings, entries);
  checkDates(cv, "projects", today, findings, entries);
  checkDates(cv, "education", today, findings, entries);

  checkOrder(cv, "experience", today, findings);
  checkOrder(cv, "education", today, findings);
  checkGaps(cv, today, findings);
  checkMissing(cv, findings);

  findings.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity) return bySeverity;
    const bySection = (a.section ?? "").localeCompare(b.section ?? "");
    if (bySection) return bySection;
    return (a.index ?? -1) - (b.index ?? -1);
  });

  const counts = { error: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;

  return {
    entries,
    findings,
    summary: {
      totalExperienceMonths: totalMonths(experienceSpans),
      gapCount: findings.filter((f) => f.type === "gap").length,
      errorCount: counts.error,
      warningCount: counts.warning,
      infoCount: counts.info,
    },
  };
}
