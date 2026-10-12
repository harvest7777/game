import { describe, expect, it } from "vitest";
import { testItem } from "../testing/defs";
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
  updateHpBars,
  pushElements,
  TOOLTIP_DELAY,
  tooltipPixel,
} from "./draw";
import type { SlotRef } from "../ecs/inventory/components";
import { DRAGGED_FROM_ALPHA, HUD_COLORS, type HudElement } from "./elements";
import { createHudState } from "./state";
import { HP_BAR_COLORS } from "./hpBar";

const LANCE = testItem({ name: "Lance", icon: "items/lance" });

const art: Art = {
  manifest: {
    sprites: [],
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

  it("draws a rect as one plain fill", () => {
    const quads = quadsOf(
      [{ kind: "rect", rect: { x: 1, y: 2, w: 10, h: 6 }, fill: [0, 1, 0, 1] }],
      0,
      0,
      4,
    );
    expect(quads).toHaveLength(1);
    expect(quads[0].fill).toBe(true);
    expect(quads[0].outline).toEqual([0, 1, 0, 1]);
    expect(quads[0].corners[0]).toEqual({ x: 4, y: 8 });
    expect(quads[0].corners[2]).toEqual({ x: 44, y: 32 });
  });

  it("outlines text when asked", () => {
    const text = (outline?: [number, number, number, number]) =>
      quadsOf([
        {
          kind: "text",
          x: 0,
          y: 0,
          text: "W",
          font: "regular",
          tint: [1, 1, 1, 1],
          outline,
        },
      ])[0];
    expect(text([0, 0, 0, 1]).outline).toEqual([0, 0, 0, 1]);
    expect(text().outline).toEqual([0, 0, 0, 0]);
  });

  it("draws an icon one UI pixel per art pixel, outlined, offset by the panel", () => {
    const [icon] = quadsOf(
      [
        {
          kind: "icon",
          rect: { x: 1, y: 1, w: 8, h: 8 },
          file: "items/lance",
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
  const SCREEN = { w: 300, h: 200 };

  function playerWith(hp?: number) {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { weapon: LANCE });
    if (hp !== undefined) {
      world.components.health.set(player, { value: hp, max: 500 });
    }
    return { world, player };
  }

  const byId = (panels: ReturnType<typeof layoutHud>) =>
    Object.fromEntries(panels.map((p) => [p.id, p]));

  it("puts the inventory in the bottom-right corner, the loadout to its left", () => {
    const { world, player } = playerWith();
    const { equipment, inventory } = byId(
      layoutHud(world, player, createHudState(), SCREEN, 0),
    );

    expect(inventory.x + inventory.layout.w).toBe(SCREEN.w - 6);
    expect(inventory.y + inventory.layout.h).toBe(SCREEN.h - 6);
    // Bottoms lined up, one slot gap apart.
    expect(equipment.y + equipment.layout.h).toBe(
      inventory.y + inventory.layout.h,
    );
    expect(inventory.x - (equipment.x + equipment.layout.w)).toBe(2);
  });

  it("puts the health bar just above the loadout, as wide as it", () => {
    const { world, player } = playerWith(450);
    const { equipment, health } = byId(
      layoutHud(world, player, createHudState(), SCREEN, 0),
    );

    expect(health.x).toBe(equipment.x);
    expect(health.layout.w).toBe(equipment.layout.w);
    expect(equipment.y - (health.y + health.layout.h)).toBe(2);
    const text = health.layout.elements.find((e) => e.kind === "text");
    expect(text).toMatchObject({ text: "450/500" });
  });

  it("shows the damage chunk the health bar remembers", () => {
    const { world, player } = playerWith(500);
    const state = createHudState();
    updateHpBars(state, world, player, 0);
    world.components.health.get(player)!.value = 250;
    updateHpBars(state, world, player, 1);

    const { health } = byId(layoutHud(world, player, state, SCREEN, 1));

    const white = health.layout.elements.filter(
      (e) => e.kind === "rect" && e.fill === HP_BAR_COLORS.chunk,
    );
    expect(white).toHaveLength(1);
  });

  it("leaves the inventory out while it's closed, the loadout where it was", () => {
    const { world, player } = playerWith();
    const state = createHudState();
    const open = byId(layoutHud(world, player, state, SCREEN, 0));
    state.inventoryOpen = false;

    const closed = byId(layoutHud(world, player, state, SCREEN, 0));

    expect(closed.inventory).toBeUndefined();
    expect(closed.equipment.x).toBe(open.equipment.x);
  });

  it("shows nothing for something without equipment", () => {
    const world = createWorld(createTiles(1, 1));
    expect(
      layoutHud(world, spawn(world), createHudState(), SCREEN, 0),
    ).toHaveLength(0);
  });

  it("places an accessible container above the health bar", () => {
    const { world, player } = playerWith(500);
    const bag = spawn(world);
    world.components.container.set(bag, {
      slots: Array.from({ length: 8 }, () => null),
    });
    world.components.containerAccess.set(player, { container: bag });

    const { health, container } = byId(
      layoutHud(world, player, createHudState(), SCREEN, 0),
    );

    expect(container.id).toBe("container");
    expect(container.x).toBe(health.x);
    expect(health.y - (container.y + container.layout.h)).toBe(2);
  });
});

describe("drawHud", () => {
  it("lays the HUD out in UI pixels on the device-pixel canvas", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { weapon: LANCE });
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
          file: "items/lance",
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
    addHoldings(world, player, { carrying: [LANCE] });
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
    addHoldings(world, player, { carrying: [LANCE] });
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
    addHoldings(world, player, { carrying: [LANCE] });
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

describe("pushElements text", () => {
  it("draws shrunk text at a fraction of the panel's pixels", () => {
    const text = (shrink?: number) =>
      quadsOf([
        {
          kind: "text",
          x: 0,
          y: 0,
          text: "W",
          font: "regular",
          tint: [1, 1, 1, 1],
          ...(shrink && { shrink }),
        },
      ]);
    const width = (q: ReturnType<typeof text>[number]) =>
      q.corners[1].x - q.corners[0].x;

    expect(width(text(2)[0])).toBeCloseTo(width(text()[0]) / 2);
  });
});
