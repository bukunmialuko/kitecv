import type { ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

interface Props<T extends string> {
  /** Read by assistive tech; the visible label sits beside the control. */
  label: string;
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
}

/**
 * A row of mutually exclusive choices, joined by hairlines. Every option is
 * visible at once, which a two- or three-way choice deserves over a dropdown:
 * the alternative is one click away and never hidden.
 */
export default function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex border border-hairline">
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors
              ${i > 0 ? "border-l border-hairline" : ""}
              ${active ? "bg-ink text-ground" : "text-muted hover:text-ink"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
