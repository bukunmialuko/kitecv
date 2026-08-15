import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Analysis from "./components/Analysis";
import Editor from "./components/Editor";
import Landing from "./components/Landing";
import Guide from "./components/Guide";
import Preview from "./components/Preview";
import Toolbar, { type PdfState } from "./components/Toolbar";
import { sampleMarkdown } from "./core/assets";
import { buildBundle } from "./core/bundle";
import { parseCv } from "./core/parse";
import { renderDocument } from "./core/render";
import { buildReport } from "./core/report";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "./core/templates";

const KEY_MD = "kite:markdown";
const KEY_TEMPLATE = "kite:template";
const KEY_THEME = "kite:theme";

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
  const [tab, setTab] = useState<"preview" | "analysis" | "guide">("preview");
  const [pdf, setPdf] = useState<PdfState>({ status: "idle" });
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(KEY_THEME, dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(KEY_TEMPLATE, templateId);
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
  const html = useMemo(
    () =>
      renderDocument(settledParse.data, {
        template: getTemplate(templateId),
        showProjects: settledParse.options.projects !== false,
        showChips: settledParse.options.chips !== false,
      }),
    [settledParse, templateId],
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
      className={`meta px-4 py-2.5 border-b-2 ${
        tab === id ? "border-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {label}
      {badge ? <span className="ml-2 border border-hairline px-1.5 py-0.5">{badge}</span> : null}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        templateId={templateId}
        onTemplate={setTemplateId}
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        onUpload={load}
        onDownloadMd={() =>
          download(new Blob([markdown], { type: "text/markdown" }), "cv.md")
        }
        onDownloadPdf={downloadPdf}
        onHome={() => {
          localStorage.removeItem(KEY_MD);
          setMarkdown(null);
        }}
        pdf={pdf}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-0 border-hairline lg:border-r">
          <Editor value={markdown} onChange={setMarkdown} />
        </div>

        <div className="flex min-h-0 flex-col border-t border-hairline lg:border-t-0">
          <div className="flex items-center border-b border-hairline">
            {tabButton("preview", "Preview")}
            {tabButton("analysis", "Analysis", report.findings.length)}
            {tabButton("guide", "Guide")}
            <div className="flex-1" />
            {tab === "preview" && pageCount > 0 && (
              <span className="meta text-muted px-4">
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            )}
          </div>

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
