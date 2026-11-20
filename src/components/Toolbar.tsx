import { useRef } from "react";
import Icon from "./Icon";

export type PdfState = { status: "idle" | "working" } | { status: "error"; message: string };

interface Props {
  dark: boolean;
  onToggleTheme: () => void;
  onUpload: (text: string) => void;
  onFormat: () => void;
  autoFormat: boolean;
  onToggleAutoFormat: () => void;
  onDownloadMd: () => void;
  onDownloadPdf: () => void;
  onHome: () => void;
  pdf: PdfState;
}

const BTN =
  "flex items-center gap-1.5 border border-hairline px-2.5 py-1.5 text-xs transition-colors hover:border-ink disabled:opacity-50";

/** A hairline between groups, so the bar reads as file · edit · output. */
const Divider = () => <span aria-hidden="true" className="mx-1.5 hidden h-5 w-px bg-hairline sm:block" />;

/**
 * App-level actions only. What the CV looks like — template, paper, code — is
 * set in the bar above the preview, beside the thing it changes.
 */
export default function Toolbar({
  dark, onToggleTheme, onUpload,
  onFormat, autoFormat, onToggleAutoFormat,
  onDownloadMd, onDownloadPdf, onHome, pdf,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const working = pdf.status === "working";

  return (
    <header className="relative border-b border-hairline">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <button
          onClick={onHome}
          className="meta mr-1 flex items-center gap-2 py-1 text-ink hover:opacity-70"
          title="Back to the start"
        >
          <Icon name="kite" />
          Kite
        </button>

        <Divider />

        <button className={BTN} onClick={() => fileRef.current?.click()} title="Open a .md file">
          <Icon name="upload" />
          <span className="hidden sm:inline">Open</span>
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

        <button className={BTN} onClick={onDownloadMd} title="Save the markdown">
          <Icon name="file" />
          <span className="hidden sm:inline">Save .md</span>
        </button>

        <Divider />

        {/* One control, two halves: run it now, or let it run itself. */}
        <div className="flex border border-hairline text-xs">
          <button
            onClick={onFormat}
            title="Tidy the markdown (⇧⌥F)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-panel"
          >
            <Icon name="format" />
            <span className="hidden sm:inline">Format</span>
          </button>
          <button
            onClick={onToggleAutoFormat}
            aria-pressed={autoFormat}
            title={
              autoFormat
                ? "Formatting runs once you stop typing — click to turn off"
                : "Formatting only runs when you ask for it — click to turn on"
            }
            className={`flex items-center gap-1.5 border-l border-hairline px-2.5 py-1.5 transition-colors hover:bg-panel ${
              autoFormat ? "text-ink" : "text-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 border border-current ${autoFormat ? "bg-current" : ""}`}
            />
            Auto
          </button>
        </div>

        <div className="flex-1" />

        {pdf.status === "error" && (
          <span className="max-w-[40ch] truncate text-xs text-sev-error" role="alert" title={pdf.message}>
            {pdf.message}
          </span>
        )}

        <button
          className={`${BTN} px-2`}
          onClick={onToggleTheme}
          title={dark ? "Light interface" : "Dark interface"}
          aria-label={dark ? "Switch to the light interface" : "Switch to the dark interface"}
        >
          <Icon name={dark ? "sun" : "moon"} />
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={working}
          // The archive holds the PDF and the markdown that produced it, so
          // "Download PDF" alone would understate what you get.
          title="PDF + Markdown (.zip)"
          className="flex items-center gap-2 border border-ink bg-ink px-3.5 py-1.5 text-xs text-ground transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          <Icon name="download" />
          {working ? "Rendering…" : pdf.status === "error" ? "Retry" : "Download"}
          <span className="meta hidden border-l border-current/30 pl-2 text-[10px] opacity-70 md:inline">
            PDF
          </span>
        </button>
      </div>

      {/* Headless Chrome takes a few seconds on a cold start; a bar that moves
          says "working" without a spinner's chrome. */}
      {working && (
        <div className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden" role="progressbar" aria-label="Rendering PDF">
          <div className="kite-indeterminate h-full w-1/3 bg-ink" />
        </div>
      )}
    </header>
  );
}
