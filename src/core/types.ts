/** The CV data model. One object threads through parse → report → render. */

export type ContactKind =
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "github"
  | "link";

export interface ContactItem {
  kind: ContactKind;
  text: string;
  href: string;
}

export interface Contact {
  email: string;
  phone: string;
  location: string;
  links: string[];
  /** Preserved row by row so the header layout can be reproduced exactly. */
  rows: ContactItem[][];
}

export interface Experience {
  company: string;
  url: string;
  role: string;
  location: string;
  start: string;
  end: string;
  highlights: string[];
  technologies: string[];
  /** Extra blank lines before this entry in the source, 0-3. Each adds a step. */
  spacing: number;
  /** A `---` line before this entry forces it onto a new page. */
  pageBreak: boolean;
}

export interface Project {
  name: string;
  url: string;
  period: string;
  link: string;
  start: string;
  end: string;
  description: string;
  highlights: string[];
  technologies: string[];
  /** Extra blank lines before this entry in the source, 0-3. Each adds a step. */
  spacing: number;
  /** A `---` line before this entry forces it onto a new page. */
  pageBreak: boolean;
}

export interface Education {
  institution: string;
  url: string;
  degree: string;
  field: string;
  year: string;
  start: string;
  end: string;
  highlights: string[];
  technologies: string[];
  /** Extra blank lines before this entry in the source, 0-3. Each adds a step. */
  spacing: number;
  /** A `---` line before this entry forces it onto a new page. */
  pageBreak: boolean;
}

export type SectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications";

export interface Cv {
  name: string;
  title: string;
  contact: Contact;
  summary: string;
  /** Kept verbatim per source line, e.g. "Languages: Python, Go". */
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: string[];
  /** The order the `##` headings appeared in — the renderer follows this. */
  sectionOrder: SectionKey[];
  /** Sections preceded by a `---`, which start on a new page. */
  sectionBreaks: SectionKey[];
}

/** Front-matter toggles. */
export interface CvOptions {
  projects?: boolean;
  chips?: boolean;
  [key: string]: boolean | string | undefined;
}

export type Severity = "error" | "warning" | "info";
export type FindingCategory = "timeline" | "missing" | "structure";

export interface Finding {
  category: FindingCategory;
  type: string;
  severity: Severity;
  section: string | null;
  index: number | null;
  message: string;
}

export interface TimelineEntry {
  section: string;
  index: number;
  label: string;
  start: string;
  end: string;
  startYm: [number, number] | null;
  endYm: [number, number] | null;
  months: number | null;
}

export interface Report {
  entries: TimelineEntry[];
  findings: Finding[];
  summary: {
    totalExperienceMonths: number;
    gapCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
}

export interface ParseResult {
  data: Cv;
  options: CvOptions;
  findings: Finding[];
}

export interface Template {
  id: string;
  name: string;
  css: string;
  /**
   * The `@font-face` rules this template's CSS depends on, with every font
   * base64-inlined. It belongs to the template rather than the document because
   * each family is ~50-150KB once inlined: emitting all of them would make a
   * Classic export carry Plex's four faces for nothing.
   */
  fontCss: string;
}

/**
 * The sheet the CV is printed on. Independent of the app's light/dark theme: the
 * shell follows the person's eyes, the paper follows what they chose to send.
 */
export type Paper = "light" | "dark";

export interface RenderOptions {
  template?: Template;
  showProjects?: boolean;
  showChips?: boolean;
  page?: "a4" | "letter";
  fontSize?: number;
  /** White (the default) or black `#222222` with white ink, edge to edge. */
  paper?: Paper;
  /** A URL to print as a scannable QR code beside the contact block. */
  qr?: string;
}
