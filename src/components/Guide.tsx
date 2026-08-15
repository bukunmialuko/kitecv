import { Fragment, useState } from "react";
import { topics } from "../guide/topics";

/**
 * Render `backticked` spans as code. A split rather than dangerouslySetInnerHTML
 * — this is a doc about markup, so it should not be the one place that injects
 * raw HTML.
 */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="bg-panel px-1 py-0.5 font-mono text-[12px]">
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function Snippet({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative mt-3 border border-dashed border-hairline">
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="meta absolute right-0 top-0 border-b border-l border-hairline
          bg-ground px-2.5 py-1 text-muted hover:text-ink"
      >
        {copied ? "copied" : "copy"}
      </button>
      <pre className="overflow-x-auto p-4 pt-8 font-mono text-[12px] leading-relaxed">
        {markdown}
      </pre>
    </div>
  );
}

export default function Guide() {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h2 className="display mb-2 text-3xl">
          <span className="block text-muted">How to write</span>
          <span className="block">a Kite CV.</span>
        </h2>
        <p className="mb-10 text-sm text-muted">
          Everything the format can do, in the order you meet it. Copy any block
          straight into the editor.
        </p>

        <nav className="mb-12 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
          {topics.map((topic, index) => (
            <a
              key={topic.id}
              href={`#${topic.id}`}
              className="bg-ground px-4 py-2.5 text-sm hover:bg-panel"
            >
              <span className="meta mr-2 text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              {topic.title}
            </a>
          ))}
        </nav>

        {topics.map((topic) => (
          <section key={topic.id} id={topic.id} className="mb-14 scroll-mt-4">
            <h3 className="meta mb-3 border-b border-hairline pb-2">{topic.title}</h3>
            <p className="text-sm leading-relaxed">
              <Prose text={topic.body} />
            </p>
            <Snippet markdown={topic.markdown} />
            {topic.note && (
              <p className="mt-3 border-l-2 border-hairline pl-3 text-[13px] leading-relaxed text-muted">
                <Prose text={topic.note} />
              </p>
            )}
          </section>
        ))}

        <p className="meta border-t border-hairline pt-6 text-muted">
          Everything here is checked by the test suite — if an example stops
          working, the build fails.
        </p>
      </div>
    </div>
  );
}
