import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Analysis from "./components/Analysis";
import DocumentBar from "./components/DocumentBar";
import Editor, { type EditorHandle } from "./components/Editor";
import Landing from "./components/Landing";
import Guide from "./components/Guide";
import Preview from "./components/Preview";
import Toolbar, { type PdfState } from "./components/Toolbar";
import { sampleMarkdown } from "./core/assets";
import { buildBundle, slugify } from "./core/bundle";
import { parseCv } from "./core/parse";
import { codeLinks, resolveCodeLink, type CodeChoice } from "./core/qr";
import { renderDocument } from "./core/render";
import { buildReport } from "./core/report";
import { DEFAULT_TEMPLATE_ID, defaultTemplate, loadTemplate } from "./core/templates";
import type { Paper } from "./core/types";

const KEY_MD = "kite:markdown";
const KEY_TEMPLATE = "kite:template";
const KEY_THEME = "kite:theme";
const KEY_AUTOFORMAT = "kite:autoformat";
const KEY_PAPER = "kite:paper";
const KEY_CODE = "kite:code";

/** Pagination costs ~150–300ms, so only it is debounced. Analysis is instant. */
const REPAGINATE_MS = 250;

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [markdown, setMarkdown] = useState<string | null>(
    () => localStorage.getItem(KEY_MD),
  );
  const [templateId, setTemplateId] = useState(
    () => localStorage.getItem(KEY_TEMPLATE) ?? DEFAULT_TEMPLATE_ID,
  );
  const [dark, setDark] = useState(() => localStorage.getItem(KEY_THEME) === "dark");
  // On unless it has been turned off: the formatter is parse-preserving, so the
  // worst it can do while you type is move your own whitespace.
  const [autoFormat, setAutoFormat] = useState(
    () => localStorage.getItem(KEY_AUTOFORMAT) !== "off",
  );
  const [paper, setPaper] = useState<Paper>(
    () => (localStorage.getItem(KEY_PAPER) === "dark" ? "dark" : "light"),
  );
  // "auto" until someone picks: the best link in the header, whichever it is
  // after their next edit. A picked URL is kept as the URL itself.
  const [codeChoice, setCodeChoice] = useState<CodeChoice>(
    () => localStorage.getItem(KEY_CODE) ?? "auto",
  );
  const [tab, setTab] = useState<"preview" | "analysis" | "guide">("preview");
  const [pdf, setPdf] = useState<PdfState>({ status: "idle" });
  const [pageCount, setPageCount] = useState(0);
  // Formatting belongs to the editor, which owns the caret it has to put back.
  const editorRef = useRef<EditorHandle>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(KEY_THEME, dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(KEY_TEMPLATE, templateId);
  }, [templateId]);

  useEffect(() => {
    localStorage.setItem(KEY_AUTOFORMAT, autoFormat ? "on" : "off");
  }, [autoFormat]);

  useEffect(() => {
    localStorage.setItem(KEY_PAPER, paper);
  }, [paper]);

  useEffect(() => {
    localStorage.setItem(KEY_CODE, codeChoice);
  }, [codeChoice]);

  // Every template but the default is a separate chunk, so switching is async.
  // The previously loaded template stays on screen until the new one arrives —
  // the swap is one repaint with no blank frame and no spinner.
  const [template, setTemplate] = useState(defaultTemplate);
  useEffect(() => {
    let cancelled = false;
    loadTemplate(templateId).then((next) => {
      if (!cancelled) setTemplate(next);
    });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  // Debounced together: the localStorage write and the value the preview reads.
  const [settled, setSettled] = useState(markdown ?? "");
  useEffect(() => {
    if (markdown === null) return;
    const timer = setTimeout(() => {
      setSettled(markdown);
      localStorage.setItem(KEY_MD, markdown);
    }, REPAGINATE_MS);
    return () => clearTimeout(timer);
  }, [markdown]);

  // Analysis reads the live value, so findings react as you type.
  const live = useMemo(() => parseCv(markdown ?? ""), [markdown]);
  const report = useMemo(() => buildReport(live.data, live.findings), [live]);

  const settledParse = useMemo(() => parseCv(settled), [settled]);
  const links = useMemo(() => codeLinks(settledParse.data), [settledParse]);
  const code = useMemo(() => resolveCodeLink(settledParse.data, codeChoice), [settledParse, codeChoice]);
  const html = useMemo(
    () =>
      renderDocument(settledParse.data, {
        template,
        paper,
        qr: code?.href,
        showProjects: settledParse.options.projects !== false,
        showChips: settledParse.options.chips !== false,
      }),
    [settledParse, template, paper, code],
  );

  const htmlRef = useRef(html);
  htmlRef.current = html;
  const markdownRef = useRef(markdown ?? "");
  markdownRef.current = markdown ?? "";

  const downloadPdf = useCallback(async () => {
    setPdf({ status: "working" });
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ html: htmlRef.current }),
      });
      if (!response.ok) {
        throw new Error((await response.text()).slice(0, 120) || `HTTP ${response.status}`);
      }
      // The PDF and the markdown that produced it travel together, so the file
      // you archive is one you can edit again.
      const pdfBytes = new Uint8Array(await response.arrayBuffer());
      const bundle = buildBundle({
        name: settledParse.data.name,
        markdown: markdownRef.current,
        pdf: pdfBytes,
      });
      download(new Blob([bundle.bytes], { type: "application/zip" }), bundle.filename);
      setPdf({ status: "idle" });
    } catch (error) {
      // Never a silent no-op, and never a corrupt file handed over as if it worked.
      setPdf({ status: "error", message: error instanceof Error ? error.message : "PDF failed" });
    }
  }, [settledParse.data.name]);

  const load = useCallback((text: string) => {
    setMarkdown(text);
    setSettled(text);
    localStorage.setItem(KEY_MD, text);
  }, []);

  if (markdown === null) {
    return (
      <Landing
        onSample={() => load(sampleMarkdown)}
        onBlank={() => load("")}
        onUpload={load}
        onGuide={() => {
          load(sampleMarkdown);
          setTab("guide");
        }}
      />
    );
  }

  const tabButton = (id: "preview" | "analysis" | "guide", label: string, badge?: number) => (
    <button
      onClick={() => setTab(id)}
      role="tab"
      aria-selected={tab === id}
      className={`meta flex h-full items-center gap-2 border-b-2 px-4 transition-colors ${
        tab === id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {label}
      {badge ? (
        <span
          className={`border px-1.5 py-px text-[10px] ${
            report.summary.errorCount ? "border-sev-error text-sev-error" : "border-hairline"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );

  const fileName = `${slugify(settledParse.data.name)}.md`;
  const words = markdown.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
  // The draft reaches localStorage on the same debounce the preview uses.
  const saved = markdown === settled;

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        onUpload={load}
        onFormat={() => editorRef.current?.format()}
        autoFormat={autoFormat}
        onToggleAutoFormat={() => setAutoFormat((on) => !on)}
        onDownloadMd={() =>
          download(new Blob([markdown], { type: "text/markdown" }), fileName)
        }
        onDownloadPdf={downloadPdf}
        onHome={() => {
          localStorage.removeItem(KEY_MD);
          setMarkdown(null);
        }}
        pdf={pdf}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col border-hairline lg:border-r">
          {/* Same height as the tab row opposite, so the two panes share one
              horizon line. */}
          <div className="flex h-10 shrink-0 items-center gap-3 border-b border-hairline px-4">
            <span className="meta text-ink">Markdown</span>
            <span className="truncate font-mono text-[11px] text-muted" title="The name your download will use">
              {fileName}
            </span>
            <div className="flex-1" />
            <span className="meta hidden text-[10px] text-muted sm:inline">
              {words.toLocaleString()} words
            </span>
            <span
              className="meta flex items-center gap-1.5 text-[10px] text-muted"
              title="Your draft is kept in this browser, never on a server"
            >
              <span aria-hidden="true" className={`size-1.5 border border-current ${saved ? "bg-current" : ""}`} />
              {saved ? "Saved" : "Saving"}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <Editor ref={editorRef} value={markdown} onChange={setMarkdown} auto={autoFormat} />
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-t border-hairline lg:border-t-0">
          <div role="tablist" className="flex h-10 shrink-0 items-stretch border-b border-hairline">
            {tabButton("preview", "Preview")}
            {tabButton("analysis", "Analysis", report.findings.length)}
            {tabButton("guide", "Guide")}
          </div>

          {tab === "preview" && (
            <DocumentBar
              templateId={templateId}
              onTemplate={setTemplateId}
              paper={paper}
              onPaper={setPaper}
              links={links}
              code={code}
              onCode={setCodeChoice}
              pageCount={pageCount}
            />
          )}

          <div className="min-h-0 flex-1">
            {/* Both stay mounted: re-mounting the preview would re-run Paged.js
                and lose scroll position every time you switch tabs. */}
            <div className={tab === "preview" ? "h-full" : "hidden"}>
              <Preview html={html} dark={dark} onPageCount={setPageCount} />
            </div>
            <div className={tab === "analysis" ? "h-full" : "hidden"}>
              <Analysis report={report} />
            </div>
            <div className={tab === "guide" ? "h-full" : "hidden"}>
              <Guide />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
