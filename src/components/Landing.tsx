import { useRef } from "react";
import Diagram from "./Diagram";

interface Props {
  onSample: () => void;
  onBlank: () => void;
  onUpload: (text: string) => void;
  onGuide: () => void;
}

const FEATURES: Array<[string, string]> = [
  ["Real PDF", "Selectable text, live links, embedded fonts. Readable by the ATS that screens it."],
  ["Page-exact preview", "Paginated as the PDF is, so you see where things land before you export."],
  ["Timeline checks", "Gaps, reversed dates, entries out of order, missing sections."],
];

export default function Landing({ onSample, onBlank, onUpload, onGuide }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="dotgrid min-h-full">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="meta text-muted mb-10">Kite — markdown cv</div>

        <h1 className="display text-5xl sm:text-7xl mb-14">
          <span className="text-muted block">Write it in Markdown.</span>
          <span className="block">Ship it as [PDF].</span>
        </h1>

        <div className="border border-dashed border-hairline p-6 mb-10">
          <Diagram className="w-full max-w-2xl mx-auto text-ink" />
        </div>

        <div className="flex flex-wrap gap-3 mb-16">
          <button
            onClick={onSample}
            className="border border-ink bg-ink text-ground px-5 py-2.5 text-sm hover:opacity-85"
          >
            Start with sample
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="border border-hairline px-5 py-2.5 text-sm hover:border-ink"
          >
            Upload .md
          </button>
          <button
            onClick={onBlank}
            className="border border-hairline px-5 py-2.5 text-sm hover:border-ink"
          >
            Blank
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
        </div>

        <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="bg-ground p-5">
              <div className="meta mb-2">{title}</div>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <p className="meta text-muted mt-10">
          Editing stays in your browser · the CV is sent only when you download ·{" "}
          <button onClick={onGuide} className="underline hover:text-ink">
            read the guide
          </button>
        </p>
      </div>
    </div>
  );
}
