import type { ReactNode } from "react";
import { PAPER_COLOURS } from "../core/render";
import { templateMeta } from "../core/templates";
import type { Paper } from "../core/types";
import Segmented from "./Segmented";

interface Props {
  templateId: string;
  onTemplate: (id: string) => void;
  paper: Paper;
  onPaper: (paper: Paper) => void;
  chips: boolean;
  onChips: (on: boolean) => void;
  /** False when no entry has a `Tech:` line, so the switch would do nothing. */
  hasChips: boolean;
  pageCount: number;
}

/** A swatch drawn in the paper's real colour, so the choice is seen, not read. */
function Swatch({ paper }: { paper: Paper }) {
  return (
    <span
      aria-hidden="true"
      // A fixed mid-grey edge, not currentColor: it has to separate a white
      // swatch from a white button and a #222 one from an ink-filled button.
      className="inline-block size-2.5 border"
      style={{ background: PAPER_COLOURS[paper], borderColor: "#8a8a8a" }}
    />
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="meta text-[10px] text-muted">{label}</span>
      {children}
    </div>
  );
}

/**
 * Everything that changes how the CV looks, and nothing that changes what it
 * says: font, paper, chips. Each control here reaches the preview, the PDF and the saved file alike.
 */
export default function DocumentBar({
  templateId, onTemplate, paper, onPaper, chips, onChips, hasChips, pageCount,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline px-4 py-2">
      <Field label="Font">
        {/* Each name is set in its own kind of type — grotesque, mono, serif —
            the way a font menu shows every font in itself: the choice is seen
            before it is read, and one click away. */}
        <Segmented
          label="Font"
          value={templateId}
          onChange={onTemplate}
          options={templateMeta.map((t) => ({
            value: t.id,
            title: `${t.name} — ${t.description}`,
            label: (
              <span className="text-[12.5px] leading-none" style={{ fontFamily: t.specimen }}>
                {t.name}
              </span>
            ),
          }))}
        />
      </Field>

      <Field label="Paper">
        <Segmented<Paper>
          label="Paper"
          value={paper}
          onChange={onPaper}
          options={[
            { value: "light", label: <><Swatch paper="light" />White</>, title: "White paper, black ink" },
            {
              value: "dark",
              label: <><Swatch paper="dark" />Black</>,
              title: "#222222 paper, white ink — made for screens; it prints edge to edge",
            },
          ]}
        />
      </Field>

      <Field label="Chips">
        {/* The swatch is a tiny chip, so the control shows what it hides. */}
        <div className={hasChips ? "" : "opacity-50"} title={hasChips ? undefined : "No Tech: lines in this CV yet"}>
          <Segmented<"on" | "off">
            label="Technology chips"
            value={chips ? "on" : "off"}
            onChange={(value) => onChips(value === "on")}
            options={[
              {
                value: "on",
                label: (
                  <>
                    <span aria-hidden="true" className="inline-block h-2 w-3.5 border border-current" />
                    On
                  </>
                ),
                title: "Each Tech: line becomes a row of chips under its entry",
              },
              { value: "off", label: "Off", title: "Hide every chip — your Tech: lines stay in the markdown" },
            ]}
          />
        </div>
      </Field>

      <div className="flex-1" />

      {pageCount > 0 && (
        <span className="meta text-[10px] text-muted">
          A4 · {pageCount} {pageCount === 1 ? "page" : "pages"}
        </span>
      )}
    </div>
  );
}
