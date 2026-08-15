import { useRef } from "react";
import { templateList } from "../core/templates";

export type PdfState = { status: "idle" | "working" } | { status: "error"; message: string };

interface Props {
  templateId: string;
  onTemplate: (id: string) => void;
  dark: boolean;
  onToggleTheme: () => void;
  onUpload: (text: string) => void;
  onDownloadMd: () => void;
  onDownloadPdf: () => void;
  onHome: () => void;
  pdf: PdfState;
}

const BTN = "border border-hairline px-3 py-1.5 text-xs hover:border-ink disabled:opacity-50";

export default function Toolbar({
  templateId, onTemplate, dark, onToggleTheme,
  onUpload, onDownloadMd, onDownloadPdf, onHome, pdf,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const working = pdf.status === "working";

  return (
    <header className="border-b border-hairline">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <button onClick={onHome} className="meta mr-2 hover:opacity-70" title="Back to the start">
          Kite
        </button>

        <button className={BTN} onClick={() => fileRef.current?.click()}>
          ↑ Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(await file.text());
            event.target.value = "";
          }}
        />

        <select
          value={templateId}
          onChange={(e) => onTemplate(e.target.value)}
          className="border border-hairline bg-ground px-3 py-1.5 text-xs hover:border-ink"
        >
          {templateList.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <button className={BTN} onClick={onDownloadMd}>
          ↓ .md
        </button>

        <div className="flex-1" />

        {pdf.status === "error" && (
          <span className="text-xs text-sev-error" role="alert">
            {pdf.message}
          </span>
        )}

        <button
          className={BTN}
          onClick={onToggleTheme}
          title={dark ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle theme"
        >
          {dark ? "☀" : "☾"}
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={working}
          // The archive holds the PDF and the markdown that produced it, so
          // "Download PDF" would understate what you get.
          title="PDF + Markdown (.zip)"
          className="border border-ink bg-ink px-4 py-1.5 text-xs text-ground hover:opacity-85 disabled:opacity-50"
        >
          {working ? "Rendering…" : pdf.status === "error" ? "Retry" : "Download"}
        </button>
      </div>
    </header>
  );
}
