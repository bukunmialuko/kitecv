import type { ReactNode } from "react";
import type { CodeChoice, CodeLink } from "../core/qr";
import { PAPER_COLOURS } from "../core/render";
import { templateMeta } from "../core/templates";
import type { Paper } from "../core/types";
import Icon from "./Icon";
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
  /** Every header link a code could carry, best first. */
  links: CodeLink[];
  /** The link the code currently carries, after the stored choice is resolved. */
  code: CodeLink | null;
  onCode: (choice: CodeChoice) => void;
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
 * says. Each control here reaches the preview, the PDF and the saved file alike.
 */
export default function DocumentBar({
  templateId, onTemplate, paper, onPaper, chips, onChips, hasChips, links, code, onCode, pageCount,
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

      <Field label="QR">
        {/* A native select: the list is the CV's own links, so its length is
            unknown, and the platform picker handles that better than a row. */}
        <label
          className={`flex items-center gap-1.5 border border-hairline pl-2 text-xs transition-colors ${
            links.length ? "hover:border-ink" : "text-muted"
          }`}
          title={
            links.length
              ? code
                ? `Scans to ${code.href}`
                : "No code on the page"
              : "Add a link to your header — a site, linkedin.com/in/… or github.com/… — to print a scannable code"
          }
        >
          <Icon name="qr" className="size-3.5" />
          <select
            aria-label="QR code link"
            value={code?.href ?? "off"}
            disabled={!links.length}
            onChange={(e) => onCode(e.target.value)}
            className="bg-ground py-1 pr-2 outline-none disabled:cursor-not-allowed"
          >
            {links.length ? (
              <>
                {links.map((link) => (
                  <option key={link.href} value={link.href}>
                    {link.label}
                  </option>
                ))}
                <option value="off">Off</option>
              </>
            ) : (
              <option value="off">No link in header</option>
            )}
          </select>
        </label>
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
