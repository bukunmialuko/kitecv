import type { Report } from "../core/types";

const SEVERITY_CLASS: Record<string, string> = {
  error: "text-sev-error",
  warning: "text-sev-warning",
  info: "text-sev-info",
};

function Bar({ report }: { report: Report }) {
  const spans = report.entries.filter((e) => e.startYm && e.endYm);
  if (!spans.length) return null;

  const toMonths = (ym: [number, number]) => ym[0] * 12 + ym[1];
  const min = Math.min(...spans.map((e) => toMonths(e.startYm!)));
  const max = Math.max(...spans.map((e) => toMonths(e.endYm!)));
  const range = Math.max(1, max - min);

  return (
    <div className="border border-hairline p-4">
      <div className="meta text-muted mb-3">Timeline</div>
      {spans.map((entry) => {
        const left = ((toMonths(entry.startYm!) - min) / range) * 100;
        const width = Math.max(1.5, ((toMonths(entry.endYm!) - toMonths(entry.startYm!)) / range) * 100);
        return (
          <div key={`${entry.section}-${entry.index}`} className="flex items-center gap-3 mb-1.5">
            <div className="w-40 shrink-0 truncate text-xs text-muted" title={entry.label}>
              {entry.label}
            </div>
            <div className="relative h-3 flex-1 border border-hairline">
              {/* A gap in the timeline reads as a blank run, not a line of text. */}
              <div
                className="absolute inset-y-0 bg-ink"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="ml-[172px] mt-1 flex justify-between text-[10px] text-muted">
        <span>{Math.floor(min / 12)}</span>
        <span>{Math.floor(max / 12)}</span>
      </div>
    </div>
  );
}

export default function Analysis({ report }: { report: Report }) {
  const { findings, summary } = report;
  const years = Math.floor(summary.totalExperienceMonths / 12);
  const months = summary.totalExperienceMonths % 12;

  return (
    <div className="h-full overflow-auto p-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ["Experience", `${years}y ${months}m`],
          ["Errors", summary.errorCount],
          ["Warnings", summary.warningCount],
          ["Gaps", summary.gapCount],
        ].map(([label, value]) => (
          <div key={label as string} className="border border-hairline px-3 py-1.5">
            <span className="meta text-muted">{label}</span>{" "}
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>

      <Bar report={report} />

      {findings.length === 0 ? (
        <div className="border border-dashed border-hairline p-5 text-sm">
          No findings — the dates are consistent and nothing is missing.
        </div>
      ) : (
        <table className="w-full border border-hairline text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel">
              <th className="meta text-muted p-2.5 text-left">Severity</th>
              <th className="meta text-muted p-2.5 text-left">Where</th>
              <th className="meta text-muted p-2.5 text-left">Finding</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding, i) => (
              <tr key={i} className="border-b border-hairline last:border-0 align-top">
                <td className={`p-2.5 whitespace-nowrap font-semibold ${SEVERITY_CLASS[finding.severity]}`}>
                  {finding.severity}
                </td>
                <td className="p-2.5 whitespace-nowrap text-muted text-xs">
                  {finding.section ?? "—"}
                  {finding.index !== null ? ` #${finding.index + 1}` : ""}
                </td>
                <td className="p-2.5">
                  {finding.message}
                  <div className="meta text-muted mt-1">
                    {finding.category} · {finding.type}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
