import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildBundle, slugify } from "./bundle";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0xff, 0x00, 0x42]);
const markdown = "# Jordan Avery\nSoftware Engineer\n\n## Summary\nHello — “quoted”.\n";

describe("slugify", () => {
  it.each([
    ["Jordan Avery", "jordan-avery"],
    ["Oluwabukunmi  Aluko", "oluwabukunmi-aluko"],
    // The accent is stripped from the letter, not treated as its own character.
    ["Ana-María O'Neill", "ana-maria-o-neill"],
    ["", "cv"],
    ["   ", "cv"],
    ["!!!", "cv"],
  ])("turns %o into a safe filename", (input, expected) => {
    expect(slugify(input as string)).toBe(expected);
  });
});

describe("buildBundle", () => {
  const bundle = buildBundle({ name: "Jordan Avery", markdown, pdf });

  it("names the archive after the person", () => {
    expect(bundle.filename).toBe("jordan-avery-cv.zip");
  });

  it("contains exactly the PDF and the markdown", () => {
    expect(Object.keys(unzipSync(bundle.bytes)).sort()).toEqual([
      "jordan-avery.md",
      "jordan-avery.pdf",
    ]);
  });

  // The point of shipping the source is that it can be edited again, so it has
  // to survive the round trip byte-for-byte.
  it("round-trips both files unchanged", () => {
    const files = unzipSync(bundle.bytes);
    expect(strFromU8(files["jordan-avery.md"])).toBe(markdown);
    expect(Array.from(files["jordan-avery.pdf"])).toEqual(Array.from(pdf));
  });

  it("starts with the ZIP local file header signature", () => {
    expect(Array.from(bundle.bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });
});
