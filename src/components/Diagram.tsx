/**
 * The one illustration in the project: markdown → parse → paginate → PDF, drawn
 * isometrically in stroke only. Inline SVG, `currentColor`, no fill — more would
 * be decoration, and each one is something to maintain.
 */
export default function Diagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 150"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* .md — a stack of sheets seen isometrically */}
      <g opacity="0.9">
        <path d="M40 74 L84 50 L128 74 L84 98 Z" />
        <path d="M40 74 L40 86 L84 110 L84 98" />
        <path d="M128 74 L128 86 L84 110" />
        <path d="M58 70 L84 55 L110 70" opacity="0.5" />
        <path d="M64 78 L84 66 L104 78" opacity="0.35" />
      </g>

      {/* parse — a cube, the data model */}
      <g opacity="0.9">
        <path d="M216 74 L260 50 L304 74 L260 98 Z" />
        <path d="M216 74 L216 90 L260 114 L260 98" />
        <path d="M304 74 L304 90 L260 114" />
        <path d="M238 62 L282 86" opacity="0.4" />
        <path d="M282 62 L238 86" opacity="0.4" />
      </g>

      {/* PDF — paginated pages, fanned */}
      <g opacity="0.9">
        <path d="M392 78 L430 56 L470 79 L432 101 Z" />
        <path d="M404 68 L442 46 L482 69 L444 91 Z" opacity="0.55" />
        <path d="M416 58 L454 36 L494 59 L456 81 Z" opacity="0.3" />
        <path d="M392 78 L392 88 L432 111 L432 101" />
        <path d="M470 79 L470 89 L432 111" />
      </g>

      {/* flow arrows */}
      <g opacity="0.55">
        <path d="M148 78 L196 78" strokeDasharray="3 4" />
        <path d="M190 74 L196 78 L190 82" />
        <path d="M324 78 L372 78" strokeDasharray="3 4" />
        <path d="M366 74 L372 78 L366 82" />
      </g>

      <g
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="10"
        letterSpacing="1.4"
        fill="currentColor"
        stroke="none"
        opacity="0.75"
        textAnchor="middle"
      >
        <text x="84" y="136">.MD</text>
        <text x="260" y="136">PARSE</text>
        <text x="443" y="136">PDF</text>
      </g>
    </svg>
  );
}
