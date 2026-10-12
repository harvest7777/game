import { describe, expect, it } from "vitest";
import { createCamera } from "../ecs/camera/resource";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn, type World } from "../ecs/world";
import type { Art } from "./art";
import {
  BAR_COLORS,
  barShown,
  healthColor,
  pushHealthBars,
} from "./healthBars";
import { HURT_FADE, HURT_SHOWN } from "../ecs/combat/hurt";
import { QuadBuffer, readQuads, type Quad } from "./quads";
import { createView, depthOf, TILE_PIXELS, worldToScreen } from "./view";
import { testItem } from "../testing/defs";
import { addHoldings } from "../ecs/inventory/bundle";

const SIZE = 400;
const CENTER = { x: 10, y: 10 };
const PIXEL = TILE_PIXELS / 8;
const ANY = { kind: "static", file: "any" } as const;
const tallArt: Art = {
  manifest: {
    sprites: [],
    fonts: { bold: {}, regular: {} },
    walls: { top: "top", side: "side" },
  },
  regions: new Map([
    ["boss", { x: 0, y: 0, w: 16, h: 16 }],
    ["top", { x: 0, y: 0, w: 8, h: 8 }],
    ["side", { x: 0, y: 0, w: 8, h: 8 }],
  ]),
  glyphs: new Map(),
};

function setup(angle = 0) {
  const world = createWorld(createTiles(20, 20));
  const view = createView({ ...createCamera(), angle }, CENTER, SIZE, SIZE);
  return { world, view };
}

// Something with health, just hit, so its bar shows.
function addHurt(world: World, hp: number, at = CENTER) {
  const e = spawn(world);
  world.components.position.set(e, { ...at });
  world.components.health.set(e, { value: hp, max: 100 });
  world.components.recentlyHurt.set(e, { age: 0, previousAge: 0 });
  return e;
}

function bars(world: World, view = setup().view, alpha = 1, art?: Art): Quad[] {
  const out = new QuadBuffer();
  pushHealthBars(out, world, view, alpha, art);
  return readQuads(out);
}

const widthOf = (q: Quad) => q.corners[1].x - q.corners[0].x;
const middleOf = (q: Quad) => (q.corners[0].x + q.corners[1].x) / 2;

describe("pushHealthBars", () => {
  it("draws a background and a fill as solid quads", () => {
    const { world, view } = setup();
    addHurt(world, 100);

    const [background, fill] = bars(world, view);

    expect(background.fill).toBe(true);
    expect(fill.fill).toBe(true);
    expect(background.outline).toEqual(
      BAR_COLORS.background.map((c) => expect.closeTo(c)),
    );
  });

  it("centers the bar under the sprite", () => {
    const { world, view } = setup();
    addHurt(world, 100, { x: 11, y: 9 });

    const [background, fill] = bars(world, view);

    const at = worldToScreen(view, { x: 11, y: 9 });
    expect(middleOf(background)).toBeCloseTo(at.x, 3);
    expect(middleOf(fill)).toBeCloseTo(at.x, 3);
    // The fill starts just below the sprite's bottom edge (half a tile down).
    expect(fill.corners[0].y).toBeGreaterThan(at.y + TILE_PIXELS / 2);
    expect(fill.corners[0].y).toBeLessThan(at.y + TILE_PIXELS / 2 + PIXEL);
  });

  it("sits below a scaled-up sprite instead of under it", () => {
    const { world, view } = setup();
    const e = addHurt(world, 100);
    const scale = 1.8;
    world.components.sprite.set(e, { art: ANY, layer: "enemy", scale });

    const [background] = bars(world, view);

    const at = worldToScreen(view, CENTER);
    const spriteBottom = at.y + (TILE_PIXELS / 2) * scale;
    expect(background.corners[0].y).toBeGreaterThan(spriteBottom - 1);
  });

  it("uses the art's true height for a large boss", () => {
    const { world, view } = setup();
    const e = addHurt(world, 100);
    world.components.sprite.set(e, {
      art: { kind: "static", file: "boss" },
      layer: "enemy",
      scale: 1.8,
    });

    const [background] = bars(world, view, 1, tallArt);

    const at = worldToScreen(view, CENTER);
    const spriteBottom = at.y + (16 / 2) * 1.8 * PIXEL;
    expect(background.corners[0].y).toBeGreaterThan(spriteBottom - 1);
  });

  it("sits below a sprite's glow", () => {
    const { world, view } = setup();
    const e = addHurt(world, 100);
    world.components.sprite.set(e, {
      art: ANY,
      layer: "enemy",
      outline: { color: [1, 1, 0, 1], glow: { radius: 2, pulseHz: 0 } },
    });

    const [background] = bars(world, view);

    // 4 sprite pixels of art plus 2 of glow below the center.
    const glowBottom = worldToScreen(view, CENTER).y + 6 * PIXEL;
    expect(background.corners[0].y).toBeGreaterThan(glowBottom - 1);
  });

  it("fills in proportion to remaining health, from the left", () => {
    const { world, view } = setup();
    addHurt(world, 40);

    const [background, fill] = bars(world, view);

    const fullWidth = 7 * PIXEL;
    expect(widthOf(fill)).toBeCloseTo(0.4 * fullWidth, 3);
    expect(widthOf(background)).toBeCloseTo(fullWidth + 2, 3);
    expect(fill.corners[0].x).toBeCloseTo(background.corners[0].x + 1, 3);
  });

  it("fills against equipment-raised Health capacity", () => {
    const { world, view } = setup();
    const entity = addHurt(world, 100);
    const ring = testItem({
      kind: "ring",
      weapon: undefined,
      bonuses: { health: 50 },
    });
    addHoldings(world, entity, { equipment: { ring } });

    const [, fill] = bars(world, view);

    expect(widthOf(fill)).toBeCloseTo((2 / 3) * 7 * PIXEL, 3);
  });

  it("draws only the background at 0 health", () => {
    const { world, view } = setup();
    addHurt(world, 0);
    expect(bars(world, view)).toHaveLength(1);
  });

  it("sits at its owner's depth so walls in front hide it", () => {
    const { world, view } = setup();
    addHurt(world, 100, { x: 10, y: 11 });

    const [background, fill] = bars(world, view);

    const depth = depthOf(view, worldToScreen(view, { x: 10, y: 11 }).y);
    expect(background.depth).toBeCloseTo(depth);
    expect(fill.depth).toBeCloseTo(depth);
  });

  it("stays level when the camera is rotated", () => {
    const { world, view } = setup(0.9);
    addHurt(world, 100);

    const [background] = bars(world, view);

    expect(background.corners[0].y).toBeCloseTo(background.corners[1].y, 3);
  });

  it("follows the interpolated position", () => {
    const { world, view } = setup();
    const e = addHurt(world, 100, { x: 12, y: 10 });
    world.components.previousPosition.set(e, { x: 10, y: 10 });

    const [background] = bars(world, view, 0.5);

    expect(middleOf(background)).toBeCloseTo(
      worldToScreen(view, { x: 11, y: 10 }).x,
      3,
    );
  });

  it("skips anything off screen", () => {
    const { world, view } = setup();
    addHurt(world, 100, { x: 40, y: 10 });
    expect(bars(world, view)).toHaveLength(0);
  });
});

describe("healthColor", () => {
  const close = (color: number[]) => color.map((c) => expect.closeTo(c));

  it("is green when full, yellow at half and red when empty", () => {
    expect(healthColor(1)).toEqual(close(BAR_COLORS.healthy));
    expect(healthColor(0.5)).toEqual(close(BAR_COLORS.hurt));
    expect(healthColor(0)).toEqual(close(BAR_COLORS.critical));
  });

  it("blends smoothly in between", () => {
    const quarter = healthColor(0.25);
    const { critical, hurt } = BAR_COLORS;
    quarter.forEach((c, i) => {
      expect(c).toBeCloseTo((critical[i] + hurt[i]) / 2);
    });
  });

  it("clamps fractions outside 0 to 1", () => {
    expect(healthColor(2)).toEqual(close(BAR_COLORS.healthy));
    expect(healthColor(-1)).toEqual(close(BAR_COLORS.critical));
  });
});

describe("which bars show", () => {
  it("always shows the player's", () => {
    const { world } = setup();
    const player = spawn(world);
    world.components.position.set(player, { ...CENTER });
    world.components.health.set(player, { value: 100, max: 100 });
    world.components.playerControlled.set(player, true);
    expect(bars(world)).toHaveLength(2);
  });

  it("hides an enemy's until it's hurt", () => {
    const { world } = setup();
    const e = spawn(world);
    world.components.position.set(e, { ...CENTER });
    world.components.health.set(e, { value: 100, max: 100 });
    expect(bars(world)).toHaveLength(0);
  });

  it("shows in full for HURT_SHOWN seconds, then fades out", () => {
    const { world } = setup();
    const e = addHurt(world, 50);
    const hurt = world.components.recentlyHurt.get(e)!;
    const alphaOf = (age: number) => {
      hurt.age = hurt.previousAge = age;
      return barShown(world, e, 1);
    };
    expect(alphaOf(HURT_SHOWN)).toBe(1);
    expect(alphaOf(HURT_SHOWN + HURT_FADE / 2)).toBeCloseTo(0.5);
    expect(alphaOf(HURT_SHOWN + HURT_FADE)).toBe(0);
  });

  it("draws a fading bar see-through", () => {
    const { world } = setup();
    const e = addHurt(world, 50);
    world.components.recentlyHurt.set(e, {
      age: HURT_SHOWN + HURT_FADE / 2,
      previousAge: HURT_SHOWN + HURT_FADE / 2,
    });
    const [background] = bars(world);
    expect(background.outline![3]).toBeCloseTo(BAR_COLORS.background[3] / 2);
  });
});
