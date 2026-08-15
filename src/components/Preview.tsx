import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Served from `public/` by `scripts/vendor-pagedjs.mjs` rather than imported:
 * the package hides the polyfill behind a non-standard export condition, and the
 * iframe needs it as a plain <script> anyway.
 */
const PAGED_POLYFILL_URL = "/paged.polyfill.js";

/** A4 content width at 96dpi. The page box never changes — only its scale does. */
const PAGE_WIDTH_PX = 794;

/**
 * Furniture for the preview only: the page sheets, their hairline borders and
 * the mono page numbers. Appended *after* the CV stylesheet, inside the iframe.
 *
 * This must never reach `renderDocument()` — it would print.
 */
const PREVIEW_CSS = `
  html { background: transparent; }
  body {
    background-image: radial-gradient(var(--kite-dot) 1px, transparent 1px);
    background-size: 24px 24px;
    margin: 0; padding: 20px 0 28px;
  }
  .pagedjs_page {
    background: #fff;
    border: 1px solid var(--kite-hairline);
    margin: 0 auto 34px;
    position: relative;
  }
  .pagedjs_page::after {
    content: "PAGE " counter(page);
    position: absolute; left: 0; right: 0; bottom: -22px;
    text-align: center;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px; letter-spacing: .12em; color: var(--kite-muted);
  }
`;

interface Props {
  /** A complete standalone document from `renderDocument()`. */
  html: string;
  dark: boolean;
  onPageCount?: (pages: number) => void;
}

export default function Preview({ html, dark, onPageCount }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(600);
  const [ready, setReady] = useState(false);

  /** Fit the fixed-width page to the pane. Never scales above 100%. */
  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const available = wrap.clientWidth - 24;
    setScale(Math.min(1, available / PAGE_WIDTH_PX));
  }, []);

  useLayoutEffect(() => {
    fit();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [fit]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    // Paged.js rebuilds the body wholesale, so the scroll position has to be
    // carried across by hand — otherwise every keystroke throws you back to
    // page 1 of a multi-page CV.
    const previousScroll = wrapRef.current?.scrollTop ?? 0;
    setReady(false);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.kind !== "kite:paged") return;
      const doc = frame.contentDocument;
      if (doc) {
        setHeight(doc.body.scrollHeight);
        onPageCount?.(doc.querySelectorAll(".pagedjs_page").length);
      }
      setReady(true);
      requestAnimationFrame(() => {
        if (wrapRef.current) wrapRef.current.scrollTop = previousScroll;
      });
    };
    window.addEventListener("message", onMessage);

    // `PagedConfig.after` fires once pagination is complete; the polyfill picks
    // the config up from the window it runs in.
    const boot = `
      <style>${PREVIEW_CSS}</style>
      <script>
        window.PagedConfig = { auto: true, after: function () {
          parent.postMessage({ kind: 'kite:paged' }, '*');
        } };
      <\/script>
      <script src="${PAGED_POLYFILL_URL}"><\/script>
    `;
    const themed = `<style>:root{--kite-hairline:${dark ? "#2a2a2a" : "#e5e5e5"};
      --kite-dot:${dark ? "#1e1e1e" : "#e8e8e8"};--kite-muted:${dark ? "#7a7a7a" : "#8a8a8a"};}</style>`;

    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html.replace("</head>", `${themed}${boot}</head>`));
    doc.close();

    return () => window.removeEventListener("message", onMessage);
  }, [html, dark, onPageCount]);

  return (
    <div ref={wrapRef} className="h-full overflow-auto dotgrid">
      <div
        style={{ width: PAGE_WIDTH_PX * scale, height: height * scale }}
        className="mx-auto"
      >
        <iframe
          ref={frameRef}
          title="CV preview"
          aria-busy={!ready}
          scrolling="no"
          style={{
            width: PAGE_WIDTH_PX,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
            display: "block",
            opacity: ready ? 1 : 0.35,
            transition: "opacity .12s linear",
          }}
        />
      </div>
    </div>
  );
}
