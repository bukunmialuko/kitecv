/**
 * The shell's icon set: 16px, 1.5px stroke, square caps and mitred joins, so
 * the icons share the shell's zero-radius geometry instead of the rounded
 * terminals of a stock set. `currentColor` throughout, so they theme with text.
 */
const PATHS = {
  kite: "M8 1.5 13 6.5 8 12 3 6.5Z M3 6.5h10 M8 1.5V12 M8 12c-1.2 1 1.2 1.6 0 2.8",
  upload: "M8 10.5v-8 M4.75 5.75 8 2.5l3.25 3.25 M2.5 10v3.5h11V10",
  download: "M8 2.5v8 M4.75 7.25 8 10.5l3.25-3.25 M2.5 10v3.5h11V10",
  file: "M3.5 1.5h6l3 3v10h-9Z M9.5 1.5v3h3 M5.5 8.5h5 M5.5 11h5",
  format: "M2.5 3.5h11 M6 6.5h7.5 M6 9.5h7.5 M2.5 12.5h11 M2.5 6.5 4 8l-1.5 1.5",
  sun: "M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M8 1v1.5 M8 13.5V15 M1 8h1.5 M13.5 8H15 M3.05 3.05l1.06 1.06 M11.89 11.89l1.06 1.06 M3.05 12.95l1.06-1.06 M11.89 4.11l1.06-1.06",
  moon: "M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z",
  qr: "M2.5 2.5h4v4h-4Z M9.5 2.5h4v4h-4Z M2.5 9.5h4v4h-4Z M9.5 9.5h1.5v1.5H9.5Z M12 12h1.5v1.5H12Z M12 9.5h1.5 M9.5 13.5H11",
  check: "M3 8.5 6.5 12 13 4.5",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`size-4 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
