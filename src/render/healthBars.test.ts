import { describe, expect, it } from "vitest";
import { createCamera } from "../ecs/camera/resource";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn, type World } from "../ecs/world";
import { BAR_COLORS, barColor, pushHealthBars } from "./healthBars";
import { QuadBuffer, readQuads, type Quad } from "./quads";
import { createView, depthOf, TILE_PIXELS, worldToScreen } from "./view";

const SIZE = 400;
const CENTER = { x: 10, y: 10 };
const PIXEL = TILE_PIXELS / 8;

function setup(angle = 0) {
  const world = createWorld(createTiles(20, 20));
  const view = createView({ ...createCamera(), angle }, CENTER, SIZE, SIZE);
  return { world, view };
}

function addHurt(world: World, hp: number, at = CENTER) {
  const e = spawn(world);
  world.components.position.set(e, { ...at });
  world.components.health.set(e, { hp, max: 100 });
  return e;
}

function bars(world: World, view = setup().view, alpha = 1): Quad[] {
  const out = new QuadBuffer();
  pushHealthBars(out, world, view, alpha);
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
    world.components.sprite.set(e, { name: "any", layer: "enemy", scale });

    const [background] = bars(world, view);

    const at = worldToScreen(view, CENTER);
    const spriteBottom = at.y + (TILE_PIXELS / 2) * scale;
    expect(background.corners[0].y).toBeGreaterThan(spriteBottom - 1);
  });

  it("sits below a sprite's glow", () => {
    const { world, view } = setup();
    const e = addHurt(world, 100);
    world.components.sprite.set(e, {
      name: "any",
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

describe("barColor", () => {
  it("is green when healthy, yellow below half, red below a quarter", () => {
    expect(barColor(1)).toBe(BAR_COLORS.healthy);
    expect(barColor(0.5)).toBe(BAR_COLORS.healthy);
    expect(barColor(0.49)).toBe(BAR_COLORS.hurt);
    expect(barColor(0.25)).toBe(BAR_COLORS.hurt);
    expect(barColor(0.24)).toBe(BAR_COLORS.critical);
  });
});
