import { describe, expect, it } from "vitest";
import { addMovable, addSprite } from "../ecs/bundles";
import { createCamera } from "../ecs/camera/resource";
import type { SpriteLayer } from "../ecs/sprite/components";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn, type World } from "../ecs/world";
import type { Art } from "./art";
import { HITBOX_COLORS, pushDebug } from "./debug";
import { QuadBuffer, readQuads, type Quad } from "./quads";
import { createView, TILE_PIXELS, worldToScreen } from "./view";

const NO_ART: Art = {
  manifest: {
    sprites: {},
    ground: {},
    walls: { top: "top", side: "side" },
    fonts: { bold: {}, regular: {} },
  },
  regions: new Map(),
  glyphs: new Map(),
};

const SIZE = 400;
const CENTER = { x: 10, y: 10 };

function setup() {
  const world = createWorld(createTiles(20, 20));
  const view = createView(createCamera(), CENTER, SIZE, SIZE);
  return { world, view };
}

function addBody(world: World, x: number, y: number, layer?: SpriteLayer) {
  const e = spawn(world);
  addMovable(world, e, { at: { x, y }, hitbox: { r: 0.4 } });
  if (layer) addSprite(world, e, { name: "any", layer });
  return e;
}

function rings(world: World, view = setup().view, alpha = 1, on = true) {
  const out = new QuadBuffer();
  pushDebug(out, world, view, NO_ART, alpha, { hitboxes: on, font: false });
  return readQuads(out);
}

// Ring center and radius on screen, recovered from the quad.
function circleOf(q: Quad) {
  const half = (q.corners[1].x - q.corners[0].x) / 2;
  return {
    x: q.corners[0].x + half,
    y: q.corners[0].y + half,
    radius: half * q.ring,
  };
}

describe("pushDebug", () => {
  it("draws nothing with hitboxes off", () => {
    const { world, view } = setup();
    addBody(world, 10, 10, "player");
    expect(rings(world, view, 1, false)).toHaveLength(0);
  });

  it("draws one ring per hitbox, the size of the hitbox", () => {
    const { world, view } = setup();
    addBody(world, 11, 9, "player");

    const [ring] = rings(world, view);

    const circle = circleOf(ring);
    const at = worldToScreen(view, { x: 11, y: 9 });
    expect(circle.x).toBeCloseTo(at.x, 3);
    expect(circle.y).toBeCloseTo(at.y, 3);
    expect(circle.radius).toBeCloseTo(0.4 * TILE_PIXELS, 3);
  });

  it("follows the interpolated position like the sprite does", () => {
    const { world, view } = setup();
    const e = addBody(world, 12, 10, "player");
    world.components.previousPosition.set(e, { x: 10, y: 10 });

    const [ring] = rings(world, view, 0.5);

    expect(circleOf(ring).x).toBeCloseTo(
      worldToScreen(view, { x: 11, y: 10 }).x,
      3,
    );
  });

  it("colors each ring by what it belongs to", () => {
    const { world, view } = setup();
    addBody(world, 9, 10, "enemy");
    addBody(world, 10, 10, "projectile");
    addBody(world, 11, 10);

    const colors = rings(world, view).map((q) => q.outline);

    const expected = [
      HITBOX_COLORS.enemy,
      HITBOX_COLORS.projectile,
      HITBOX_COLORS.other,
    ];
    colors.forEach((color, i) =>
      color.forEach((channel, c) =>
        expect(channel).toBeCloseTo(expected[i][c]),
      ),
    );
    expect(colors).toHaveLength(3);
  });

  it("is the nearest thing on screen", () => {
    const { world, view } = setup();
    addBody(world, 10, 10, "player");
    expect(rings(world, view)[0].depth).toBe(0);
  });

  it("skips hitboxes off screen", () => {
    const { world, view } = setup();
    addBody(world, 40, 10, "enemy");
    expect(rings(world, view)).toHaveLength(0);
  });
});

describe("font sheet", () => {
  it("draws every glyph of both fonts in the top-right corner when on", () => {
    const { world, view } = setup();
    const art: Art = {
      ...NO_ART,
      manifest: {
        ...NO_ART.manifest,
        fonts: { bold: { "1": "b1" }, regular: { A: "rA" } },
      },
      regions: new Map([
        ["b1", { x: 0, y: 0, w: 8, h: 8 }],
        ["rA", { x: 10, y: 0, w: 8, h: 8 }],
      ]),
      glyphs: new Map([
        ["b1", { left: 0, width: 4 }],
        ["rA", { left: 0, width: 4 }],
      ]),
    };
    const out = new QuadBuffer();

    pushDebug(out, world, view, art, 1, { hitboxes: false, font: true });

    const quads = readQuads(out);
    // Only the glyphs these fonts have: "A" in the capitals line and "1" in
    // the bold line.
    expect(quads).toHaveLength(2);
    for (const q of quads) {
      expect(q.corners[1].x).toBeLessThanOrEqual(SIZE);
      expect(q.corners[0].y).toBeLessThan(SIZE / 2);
    }
  });

  it("draws nothing when off", () => {
    const { world, view } = setup();
    const out = new QuadBuffer();
    pushDebug(out, world, view, NO_ART, 1, { hitboxes: false, font: false });
    expect(out.count).toBe(0);
  });
});
