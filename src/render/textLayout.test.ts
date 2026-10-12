import { describe, expect, it } from "vitest";
import type { Art } from "./art";
import { QuadBuffer, readQuads } from "./quads";
import { OUTLINE_THICKNESS } from "./sprites";
import {
  layoutText,
  LETTER_SPACING,
  pushText,
  SPACE_WIDTH,
} from "./textLayout";

// A tiny font: "i" is 1 wide, "m" 5 wide, "o" 4 wide starting a column in.
const font = { i: "g/i", m: "g/m", o: "g/o" };
const glyphs = new Map([
  ["g/i", { left: 0, width: 1 }],
  ["g/m", { left: 0, width: 5 }],
  ["g/o", { left: 1, width: 4 }],
]);

describe("layoutText", () => {
  it("places each glyph after the last one's ink plus the letter spacing", () => {
    const { glyphs: placed, width } = layoutText("imo", font, glyphs);
    expect(placed).toEqual([
      { file: "g/i", x: 0 },
      { file: "g/m", x: 1 + LETTER_SPACING },
      // "o"'s ink starts a column into its cell, so its cell starts earlier.
      { file: "g/o", x: 1 + LETTER_SPACING + 5 + LETTER_SPACING - 1 },
    ]);
    expect(width).toBe(1 + LETTER_SPACING + 5 + LETTER_SPACING + 4);
  });

  it("leaves a gap for spaces", () => {
    const { glyphs: placed } = layoutText("i i", font, glyphs);
    expect(placed[1].x).toBe(1 + LETTER_SPACING + SPACE_WIDTH);
  });

  it("skips characters the font doesn't have", () => {
    const { glyphs: placed } = layoutText("i?m", font, glyphs);
    expect(placed.map((g) => g.file)).toEqual(["g/i", "g/m"]);
  });

  it("is empty for empty text", () => {
    expect(layoutText("", font, glyphs)).toEqual({ glyphs: [], width: 0 });
  });
});

describe("pushText", () => {
  const art: Art = {
    manifest: {
      sprites: [],
      ground: {},
      walls: { top: "top", side: "side" },
      fonts: { regular: font, bold: {} },
    },
    regions: new Map(
      ["g/i", "g/m", "g/o"].map((f, i) => [f, { x: i * 10, y: 0, w: 8, h: 8 }]),
    ),
    glyphs,
  };
  const style = {
    font: "regular" as const,
    pixel: 2,
    tint: [1, 1, 1, 1] as [number, number, number, number],
  };

  function draw(text: string, x: number, y: number, changes = {}) {
    const out = new QuadBuffer();
    const width = pushText(out, art, text, x, y, { ...style, ...changes });
    return { quads: readQuads(out), width };
  }

  it("draws one 8x8 cell per glyph, scaled by the pixel size", () => {
    const { quads } = draw("im", 100, 50);
    expect(quads).toHaveLength(2);
    expect(quads[1].corners[0]).toEqual({ x: 100 + 2 * 2, y: 50 });
    expect(quads[1].corners[2]).toEqual({ x: 100 + 2 * 2 + 16, y: 50 + 16 });
  });

  it("returns its width in screen pixels", () => {
    expect(draw("im", 0, 0).width).toBe((1 + 1 + 5) * 2);
  });

  it("can center on x", () => {
    const { quads, width } = draw("im", 100, 0, { align: "center" });
    expect(quads[0].corners[0].x).toBe(100 - width / 2);
  });

  it("grows each cell by the outline when outlined", () => {
    const { quads } = draw("i", 100, 50, { outline: { color: [0, 0, 0, 1] } });
    const pad = OUTLINE_THICKNESS * 2;
    expect(quads[0].corners[0].x).toBeCloseTo(100 - pad);
    expect(quads[0].margin).toBeCloseTo(OUTLINE_THICKNESS);
    expect(quads[0].outline).toEqual([0, 0, 0, 1]);
  });

  it("tints every glyph", () => {
    const { quads } = draw("im", 0, 0, { tint: [1, 0, 0, 0.5] });
    expect(quads.every((q) => q.tint[0] === 1 && q.tint[3] === 0.5)).toBe(true);
  });
});
