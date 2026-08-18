import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { formatMarkdown, mapCaret } from "../core/format";

export interface EditorHandle {
  /** Format now — the toolbar button and ⇧⌥F both land here. */
  format: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Format once the typing stops. */
  auto: boolean;
  ref?: Ref<EditorHandle>;
}

/**
 * Long enough to sit out a pause for thought, short enough that the tidy-up
 * still feels like a response to what you just typed.
 */
const IDLE_MS = 2000;

/** True when the caret sits on a line with nothing on it — room someone is in
 * the middle of making, which the formatter would close up under them. */
function caretOnBlankLine(area: HTMLTextAreaElement): boolean {
  const from = area.value.lastIndexOf("\n", area.selectionStart - 1) + 1;
  const found = area.value.indexOf("\n", area.selectionStart);
  const to = found === -1 ? area.value.length : found;
  return area.value.slice(from, to).trim() === "";
}

export default function Editor({ value, onChange, auto, ref }: Props) {
  const [over, setOver] = useState(false);
  const [composing, setComposing] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * `focus` is what separates the two callers: asking for a format puts the
   * caret back in the editor, where the undo stack lives, while the idle timer
   * must never pull focus away from wherever it has gone.
   */
  const format = useCallback((focus = false) => {
    const next = formatMarkdown(value);
    if (next === value) return;

    const area = areaRef.current;
    if (area && focus) area.focus();
    if (!area || document.activeElement !== area) {
      onChange(next);
      return;
    }

    const caret = area.selectionStart;
    area.setSelectionRange(0, value.length);
    // Replacing the text through insertText rather than through React keeps the
    // browser's own undo stack: one Ctrl+Z steps back over the format the way it
    // steps back over any other edit. A state write would have thrown it away.
    const replaced = document.execCommand("insertText", false, next) && area.value === next;
    if (replaced) {
      const at = mapCaret(value, next, caret);
      area.setSelectionRange(at, at);
    }
    // The insert fires the input event React reads, so this is usually the same
    // value arriving twice. It is here so the DOM and state cannot disagree if
    // the browser ever declines the edit.
    onChange(next);
  }, [value, onChange]);

  useImperativeHandle(ref, () => ({ format: () => format(true) }), [format]);

  useEffect(() => {
    if (!auto || composing) return;
    const timer = setTimeout(() => {
      const area = areaRef.current;
      // Both of these are moments where a rewrite would fight the person typing
      // rather than tidy up after them, so it waits for the next pause instead.
      if (area && document.activeElement === area) {
        if (area.selectionStart !== area.selectionEnd) return;
        if (caretOnBlankLine(area)) return;
      }
      format();
    }, IDLE_MS);
    return () => clearTimeout(timer);
  }, [auto, composing, value, format]);

  return (
    <div
      className={`h-full ${over ? "bg-panel" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onChange(await file.text());
      }}
    >
      <textarea
        ref={areaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // `code` rather than `key`: with Alt held, the key is whatever the
        // layout produces, but the physical F is always KeyF.
        onKeyDown={(e) => {
          if (e.shiftKey && e.altKey && e.code === "KeyF") {
            e.preventDefault();
            format();
          }
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        spellCheck={false}
        // Soft-wrapped, unlike the preview: markdown source lines are arbitrary
        // length and wrapping them costs nothing.
        wrap="soft"
        className={`h-full w-full resize-none bg-transparent p-5 font-mono text-[13px]
          leading-relaxed outline-none ${over ? "border-2 border-dashed border-ink" : ""}`}
        placeholder="# Your Name&#10;Job Title&#10;you@example.com&#10;&#10;## Experience&#10;### Company | 2023 – Present&#10;Role | Location&#10;- What you did.&#10;&#10;Drop a .md file here to load it."
      />
    </div>
  );
}
