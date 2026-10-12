import { describe, expect, it } from "vitest";
import { healthColor } from "../render/healthBars";
import type { HudElement } from "./elements";
import {
  chunkTop,
  HP_BAR_COLORS,
  HP_BAR_HEIGHT,
  HP_BAR_SCALE,
  HP_CHUNK_HOLD,
  HP_CHUNK_SHRINK,
  hpBar,
  stepHpBar,
} from "./hpBar";

// 52 UI pixels wide is 104 of the bar's half-size pixels, so the fill
// inside the 1-pixel frame is 102 across and 9 tall.
const WIDTH = 52;
const INNER = WIDTH * HP_BAR_SCALE - 2;
const INNER_H = HP_BAR_HEIGHT - 2;

const rects = (elements: HudElement[]) =>
  elements.flatMap((e) => (e.kind === "rect" ? [e] : []));

describe("hpBar", () => {
  it("is a frame the given width, at half the HUD's size", () => {
    const bar = hpBar({ hp: 100, max: 100 }, undefined, WIDTH);
    expect([bar.w, bar.h]).toEqual([WIDTH, HP_BAR_HEIGHT / HP_BAR_SCALE]);
    expect(bar.scale).toBe(HP_BAR_SCALE);
    expect(bar.elements[0]).toMatchObject({
      kind: "box",
      rect: { x: 0, y: 0, w: WIDTH * HP_BAR_SCALE, h: HP_BAR_HEIGHT },
    });
  });

  it("fills health from the left in its health color", () => {
    const [fill] = rects(
      hpBar({ hp: 30, max: 100 }, undefined, WIDTH).elements,
    );
    expect(fill.rect).toEqual({ x: 1, y: 1, w: INNER * 0.3, h: INNER_H });
    expect(fill.fill).toEqual(healthColor(0.3));
  });

  it("draws the white chunk between health and the chunk's top", () => {
    const [, chunk] = rects(hpBar({ hp: 30, max: 100 }, 50, WIDTH).elements);
    expect(chunk.rect.x).toBeCloseTo(1 + INNER * 0.3);
    expect(chunk.rect.w).toBeCloseTo(INNER * 0.2);
    expect(chunk.rect.h).toBe(INNER_H);
    expect(chunk.fill).toEqual(HP_BAR_COLORS.chunk);
  });

  it("leaves the fill out when empty", () => {
    expect(
      rects(hpBar({ hp: 0, max: 100 }, undefined, WIDTH).elements),
    ).toEqual([]);
  });

  it("says hp/max, centered, a pixel clear of the frame", () => {
    const text = hpBar({ hp: 449.5, max: 500 }, undefined, WIDTH).elements.find(
      (e) => e.kind === "text",
    );
    expect(text).toMatchObject({
      text: "450/500",
      x: (WIDTH * HP_BAR_SCALE) / 2,
      // Below the 1-pixel frame and a pixel of room; the 7-pixel digits
      // then leave a pixel above the bottom frame too.
      y: 2,
      align: "center",
    });
    expect(HP_BAR_HEIGHT).toBe(2 + 7 + 2);
  });
});

describe("stepHpBar", () => {
  it("starts with no chunk", () => {
    expect(stepHpBar(undefined, 100, 0)).toEqual({ hp: 100 });
  });

  it("starts a chunk from the old health when hurt", () => {
    const hurt = stepHpBar({ hp: 100 }, 70, 5);
    expect(hurt).toEqual({ hp: 70, chunk: { top: 100, at: 5 } });
  });

  it("extends a shrinking chunk from where it's got to", () => {
    const hurt = stepHpBar({ hp: 100 }, 70, 0);
    // Halfway through shrinking, eased in, the chunk has come down an
    // eighth of the way: from 100 to 96.25.
    const later = HP_CHUNK_HOLD + HP_CHUNK_SHRINK / 2;
    const again = stepHpBar(hurt, 60, later);
    expect(again.chunk!.top).toBeCloseTo(96.25);
  });

  it("heals without a chunk", () => {
    expect(stepHpBar({ hp: 50 }, 80, 1)).toEqual({ hp: 80 });
  });
});

describe("chunkTop", () => {
  const state = { hp: 70, chunk: { top: 100, at: 0 } };

  it("holds at the old health first", () => {
    expect(chunkTop(state, HP_CHUNK_HOLD)).toBe(100);
  });

  it("shrinks slowly at first, then speeds up into the new health", () => {
    const at = (t: number) =>
      chunkTop(state, HP_CHUNK_HOLD + HP_CHUNK_SHRINK * t)!;
    // Eased in (cubed): an eighth of the way at the halfway point.
    expect(at(0.5)).toBeCloseTo(100 - 30 / 8);
    const firstQuarter = at(0) - at(0.25);
    const lastQuarter = at(0.75) - at(0.99);
    expect(lastQuarter).toBeGreaterThan(firstQuarter * 5);
  });

  it("is gone once it has shrunk away", () => {
    expect(chunkTop(state, HP_CHUNK_HOLD + HP_CHUNK_SHRINK)).toBeUndefined();
  });
});
