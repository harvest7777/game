import { describe, expect, it } from "vitest";
import { addHoldings } from "../ecs/inventory/bundle";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import type { Art } from "../render/art";
import { QuadBuffer, readQuads } from "../render/quads";
import { OUTLINE_THICKNESS } from "../render/sprites";
import { drawHud, layoutHud, pushElements } from "./draw";
import type { HudElement } from "./elements";
import { createHudState } from "./state";

const art: Art = {
  manifest: {
    sprites: { "item.lance": { kind: "static", file: "items/lance" } },
    ground: {},
    walls: { top: "top", side: "side" },
    fonts: { bold: {}, regular: { W: "rW" } },
  },
  regions: new Map([
    ["items/lance", { x: 40, y: 0, w: 8, h: 8 }],
    ["rW", { x: 50, y: 0, w: 8, h: 8 }],
  ]),
  glyphs: new Map([["rW", { left: 0, width: 5 }]]),
};

function quadsOf(elements: HudElement[], x = 0, y = 0, pixel = 4) {
  const out = new QuadBuffer();
  pushElements(out, art, elements, x, y, pixel);
  return readQuads(out);
}

describe("pushElements", () => {
  it("draws a box as a border with the fill inset one UI pixel", () => {
    const [border, inner] = quadsOf(
      [
        {
          kind: "box",
          rect: { x: 1, y: 2, w: 10, h: 6 },
          fill: [0, 0, 1, 1],
          border: [1, 0, 0, 1],
        },
      ],
      0,
      0,
      4,
    );
    expect(border.fill && inner.fill).toBe(true);
    expect(border.outline).toEqual([1, 0, 0, 1]);
    expect(border.corners[0]).toEqual({ x: 4, y: 8 });
    expect(border.corners[2]).toEqual({ x: 44, y: 32 });
    expect(inner.outline).toEqual([0, 0, 1, 1]);
    expect(inner.corners[0]).toEqual({ x: 8, y: 12 });
    expect(inner.corners[2]).toEqual({ x: 40, y: 28 });
  });

  it("draws an icon one UI pixel per art pixel, outlined, offset by the panel", () => {
    const [icon] = quadsOf(
      [
        {
          kind: "icon",
          rect: { x: 1, y: 1, w: 8, h: 8 },
          sprite: "item.lance",
        },
      ],
      10,
      20,
      4,
    );
    const pad = OUTLINE_THICKNESS * 4;
    expect(icon.region.x).toBe(40);
    expect(icon.corners[0].x).toBeCloseTo(11 * 4 - pad);
    expect(icon.corners[0].y).toBeCloseTo(21 * 4 - pad);
    expect(icon.corners[2].x).toBeCloseTo(19 * 4 + pad);
    expect(icon.outline).toEqual([0, 0, 0, 1]);
  });

  it("draws text at the UI pixel size", () => {
    const [glyph] = quadsOf([
      {
        kind: "text",
        x: 2,
        y: 3,
        text: "W",
        font: "regular",
        tint: [1, 1, 1, 1],
      },
    ]);
    expect(glyph.corners[0]).toEqual({ x: 8, y: 12 });
    expect(glyph.corners[2]).toEqual({ x: 8 + 32, y: 12 + 32 });
  });

  it("draws nothing for slot hit areas", () => {
    expect(
      quadsOf([
        {
          kind: "slot",
          rect: { x: 0, y: 0, w: 10, h: 10 },
          ref: { in: "inventory", index: 0 },
        },
      ]),
    ).toHaveLength(0);
  });
});

describe("layoutHud", () => {
  it("puts the equipment panel in the bottom-right corner by default", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { weapon: "lance" });

    const [panel] = layoutHud(world, player, createHudState(), {
      w: 300,
      h: 200,
    });

    expect(panel.id).toBe("equipment");
    expect(panel.x + panel.layout.w).toBe(300 - 6);
    expect(panel.y + panel.layout.h).toBe(200 - 6);
  });

  it("shows no equipment panel for something without equipment", () => {
    const world = createWorld(createTiles(1, 1));
    expect(
      layoutHud(world, spawn(world), createHudState(), { w: 300, h: 200 }),
    ).toHaveLength(0);
  });
});

describe("drawHud", () => {
  it("lays the HUD out in UI pixels on the device-pixel canvas", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { weapon: "lance" });
    const out = new QuadBuffer();

    drawHud(out, art, world, player, createHudState(), 1200, 800, 4);

    // The panel frame's bottom-right is 6 UI pixels in from the corner.
    const [frame] = readQuads(out);
    expect(frame.corners[2]).toEqual({ x: 1200 - 6 * 4, y: 800 - 6 * 4 });
  });
});
