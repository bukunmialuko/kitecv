import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: Props) {
  const [over, setOver] = useState(false);

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
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
