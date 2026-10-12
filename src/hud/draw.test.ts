import { describe, expect, it } from "vitest";
import { addHoldings } from "../ecs/inventory/bundle";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import type { Art } from "../render/art";
import { QuadBuffer, readQuads } from "../render/quads";
import { OUTLINE_THICKNESS } from "../render/sprites";
import {
  drawHud,
  FLASH_SECONDS,
  layoutHud,
  pushElements,
  TOOLTIP_DELAY,
  tooltipPixel,
} from "./draw";
import type { SlotRef } from "../ecs/inventory/components";
import { DRAGGED_FROM_ALPHA, HUD_COLORS, type HudElement } from "./elements";
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

  it("stacks the inventory just above the equipment, aligned", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { weapon: "lance" });

    const [equipment, inventory] = layoutHud(world, player, createHudState(), {
      w: 300,
      h: 200,
    });

    expect(inventory.id).toBe("inventory");
    expect(inventory.x).toBe(equipment.x);
    expect(inventory.y + inventory.layout.h).toBeLessThan(equipment.y);
    expect(
      equipment.y - (inventory.y + inventory.layout.h),
    ).toBeLessThanOrEqual(4);
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

    drawHud(out, art, world, player, createHudState(), 1200, 800, 4, 0);

    // The HUD's bottom-right edge is 6 UI pixels in from the corner.
    const quads = readQuads(out);
    expect(Math.max(...quads.map((q) => q.corners[2].x))).toBe(1200 - 6 * 4);
    expect(Math.max(...quads.map((q) => q.corners[2].y))).toBe(800 - 6 * 4);
  });
});

describe("drawing interaction", () => {
  const slotBox = (ref: SlotRef): HudElement => ({
    kind: "box",
    rect: { x: 0, y: 0, w: 10, h: 10 },
    fill: [0, 0, 0, 1],
    border: [0.3, 0.3, 0.3, 1],
    ref,
  });
  const inv0: SlotRef = { in: "inventory", index: 0 };

  it("highlights the hovered slot's border", () => {
    const out = new QuadBuffer();
    pushElements(out, art, [slotBox(inv0)], 0, 0, 4, { hover: inv0 });
    expect(readQuads(out)[0].outline).toEqual(
      HUD_COLORS.hoverBorder.map((c) => expect.closeTo(c)),
    );
  });

  it("leaves other slots' borders alone", () => {
    const out = new QuadBuffer();
    pushElements(out, art, [slotBox(inv0)], 0, 0, 4, {
      hover: { in: "inventory", index: 1 },
    });
    expect(readQuads(out)[0].outline).toEqual([
      expect.closeTo(0.3),
      expect.closeTo(0.3),
      expect.closeTo(0.3),
      1,
    ]);
  });

  it("fades an item being dragged out of its slot", () => {
    const out = new QuadBuffer();
    pushElements(
      out,
      art,
      [
        {
          kind: "icon",
          rect: { x: 1, y: 1, w: 8, h: 8 },
          sprite: "item.lance",
          ref: inv0,
        },
      ],
      0,
      0,
      4,
      { dragged: inv0 },
    );
    expect(readQuads(out)[0].tint[3]).toBeCloseTo(DRAGGED_FROM_ALPHA);
  });

  it("draws a dragged item at the pointer, last", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { carrying: ["lance"] });
    const state = createHudState();
    state.pointer = { x: 50, y: 40 };
    state.press = {
      at: { x: 0, y: 0 },
      dragging: true,
      item: inv0,
    };
    const out = new QuadBuffer();

    drawHud(out, art, world, player, state, 1200, 800, 4, 0);

    const quads = readQuads(out);
    const last = quads[quads.length - 1];
    expect(last.region.x).toBe(40);
    const middle = (last.corners[0].x + last.corners[2].x) / 2;
    expect(middle).toBeCloseTo(50 * 4);
    expect(last.tint[3]).toBe(1);
  });
});

describe("tooltips", () => {
  function hovering(hoverSince: number) {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { carrying: ["lance"] });
    const state = createHudState();
    state.pointer = { x: 50, y: 40 };
    state.hover = { in: "inventory", index: 0 };
    state.hoverSince = hoverSince;
    return { world, player, state };
  }

  function draw(h: ReturnType<typeof hovering>, time: number) {
    const out = new QuadBuffer();
    drawHud(out, art, h.world, h.player, h.state, 1200, 800, 4, time);
    return readQuads(out);
  }

  // The tooltip is a box drawn after the panels, so with it the quad count
  // goes up and the last box sits by the pointer.
  it("shows after the item has been hovered long enough", () => {
    const h = hovering(1);
    const before = draw(h, 1 + TOOLTIP_DELAY - 0.01).length;
    const after = draw(h, 1 + TOOLTIP_DELAY + 0.01).length;
    expect(after).toBeGreaterThan(before);
  });

  it("draws at half the HUD's scale, beside the pointer", () => {
    const h = hovering(0);
    const quads = draw(h, 5);
    // The tooltip is drawn last; its glyph cells are 8 tooltip pixels tall.
    const last = quads[quads.length - 1];
    expect(last.corners[2].y - last.corners[0].y).toBe(8 * tooltipPixel(4));
    expect(tooltipPixel(4)).toBe(2);
    // Beside the pointer at UI (50, 40) = device (200, 160).
    expect(Math.abs(last.corners[0].x - 200)).toBeLessThan(400);
  });

  it("doesn't show over an empty slot", () => {
    const h = hovering(0);
    const noTooltip = draw(h, 0).length;
    h.state.hover = { in: "inventory", index: 5 };
    expect(draw(h, 5).length).toBe(noTooltip);
  });

  it("doesn't show while dragging", () => {
    const h = hovering(0);
    const showing = draw(h, 5).length;
    h.state.press = { at: { x: 0, y: 0 }, dragging: true, item: h.state.hover };
    // The dragged icon adds one quad; the tooltip would add more.
    expect(draw(h, 5).length).toBeLessThan(showing);
  });
});

describe("flashes", () => {
  const box = (ref: SlotRef): HudElement => ({
    kind: "box",
    rect: { x: 0, y: 0, w: 10, h: 10 },
    fill: [0, 0, 0, 1],
    border: [0.3, 0.3, 0.3, 1],
    ref,
  });
  const inv0: SlotRef = { in: "inventory", index: 0 };

  it("turns a slot's border white, fading with its strength", () => {
    const borderAt = (strength: number) => {
      const out = new QuadBuffer();
      pushElements(out, art, [box(inv0)], 0, 0, 4, {
        flashes: [{ ref: inv0, strength }],
      });
      return readQuads(out)[0].outline[0];
    };
    expect(borderAt(1)).toBeCloseTo(1);
    expect(borderAt(0.5)).toBeCloseTo(0.65);
    expect(borderAt(0)).toBeCloseTo(0.3);
  });

  it("fades out over FLASH_SECONDS in drawHud", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { carrying: ["lance"] });
    const state = createHudState();
    state.flashes = [{ ref: inv0, at: 10 }];

    const borderAt = (time: number) => {
      const out = new QuadBuffer();
      drawHud(out, art, world, player, state, 1200, 800, 4, time);
      // Find the inventory slot 0 border: the brightest grey-to-white quad.
      return Math.max(
        ...readQuads(out).map((q) => (q.fill ? q.outline[0] : 0)),
      );
    };
    expect(borderAt(10)).toBeCloseTo(1);
    expect(borderAt(10 + FLASH_SECONDS + 0.1)).toBeLessThan(0.9);
  });
});
