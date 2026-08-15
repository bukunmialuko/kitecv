/// <reference types="vite/client" />

// `?raw` gives the file contents as a string; `?inline` gives a base64 data URI.
// Both are Vite features, which is why every such import is confined to
// `src/core/assets.ts` — see CLAUDE.md.
declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "*?inline" {
  const dataUri: string;
  export default dataUri;
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}

declare module "*.css?raw" {
  const content: string;
  export default content;
}

declare module "*.woff2?inline" {
  const dataUri: string;
  export default dataUri;
}
