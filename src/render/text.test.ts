import { describe, expect, it } from "vitest";
import { createCamera } from "../ecs/camera/resource";
import type { FloatingText } from "../ecs/text/components";
import { DAMAGE_TEXT, floatingTextSystem } from "../ecs/text/system";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn, type World } from "../ecs/world";
import type { Art } from "./art";
import { QuadBuffer, readQuads, type Quad } from "./quads";
import { TEXT_SCALE, pushFloatingText } from "./text";
import { LETTER_SPACING } from "./textLayout";
import { createView, TILE_PIXELS, worldToScreen, type View } from "./view";

const digits = [..."0123456789"];
// Each digit gets its own x so a quad's region says which digit it is.
const art: Art = {
  manifest: {
    sprites: { boss: { kind: "static", file: "boss" } },
    ground: {},
    walls: { top: "top", side: "side" },
    fonts: {
      bold: Object.fromEntries(digits.map((d) => [d, `font/${d}`])),
      regular: {},
    },
  },
  regions: new Map([
    ...digits.map(
      (d, i) => [`font/${d}`, { x: i * 10, y: 0, w: 8, h: 8 }] as const,
    ),
    ["boss", { x: 100, y: 0, w: 16, h: 16 }],
  ]),
  // Bold digits are 6 wide from the left of their cell, except a narrow 1.
  glyphs: new Map(
    digits.map((d) => [`font/${d}`, { left: 0, width: d === "1" ? 4 : 6 }]),
  ),
};
const digitOf = (q: Quad) => digits[q.region.x / 10];

const SIZE = 400;
const CENTER = { x: 10, y: 10 };
const FONT = (TILE_PIXELS / 8) * TEXT_SCALE;

function setup(angle = 0) {
  const world = createWorld(createTiles(20, 20));
  const view = createView({ ...createCamera(), angle }, CENTER, SIZE, SIZE);
  return { world, view };
}

function addText(world: World, changes: Partial<FloatingText> = {}) {
  const e = spawn(world);
  world.components.position.set(e, { ...CENTER });
  world.components.floatingText.set(e, {
    text: "27",
    color: [1, 0, 0, 1],
    age: 0,
    previousAge: 0,
    lifetime: 0.8,
    rise: 1.25,
    lift: 0,
    ...changes,
  });
  return e;
}

function draw(world: World, view: View, alpha = 1): Quad[] {
  const out = new QuadBuffer();
  pushFloatingText(out, world, view, art, alpha);
  return readQuads(out);
}

const bottomOf = (q: Quad) => q.corners[2].y;

describe("pushFloatingText", () => {
  it("draws one glyph per character, in order", () => {
    const { world, view } = setup();
    addText(world, { text: "305" });
    expect(draw(world, view).map(digitOf)).toEqual(["3", "0", "5"]);
  });

  it("centers the digits' ink on what it floats over", () => {
    const { world, view } = setup();
    addText(world, { text: "27" });

    const quads = draw(world, view);

    // Ink runs from the first cell's left edge (past its outline pad) to 6
    // font pixels into the last cell.
    const firstInk = quads[0].corners[0].x + 0.2 * FONT;
    const lastInk = quads[1].corners[0].x + (0.2 + 6) * FONT;
    const at = worldToScreen(view, CENTER);
    expect((firstInk + lastInk) / 2).toBeCloseTo(at.x, 3);
  });

  it("spaces digits by their own widths, so a 1 takes less room", () => {
    const { world, view } = setup();
    addText(world, { text: "11" });
    addText(world, { text: "22", lift: 2 });
    const [one, oneAgain, two, twoAgain] = draw(world, view);
    const gap = (a: Quad, b: Quad) => b.corners[0].x - a.corners[0].x;
    expect(gap(one, oneAgain)).toBeCloseTo((4 + LETTER_SPACING) * FONT, 3);
    expect(gap(two, twoAgain)).toBeCloseTo((6 + LETTER_SPACING) * FONT, 3);
  });

  it("starts just above where a sprite's top would be", () => {
    const { world, view } = setup();
    addText(world);
    const [glyph] = draw(world, view);
    const spriteTop = worldToScreen(view, CENTER).y - TILE_PIXELS / 2;
    // Bottom of the glyph cell, outline included.
    expect(bottomOf(glyph)).toBeCloseTo(spriteTop + 0.2 * FONT, 3);
  });

  it("starts above a large followed boss rather than inside it", () => {
    const { world, view } = setup();
    const boss = spawn(world);
    world.components.position.set(boss, { ...CENTER });
    world.components.sprite.set(boss, {
      name: "boss",
      layer: "enemy",
      scale: 1.8,
    });
    addText(world, { follows: boss });

    const bottom = bottomOf(draw(world, view)[0]);
    const bossTop =
      worldToScreen(view, CENTER).y - (16 * 1.8 * (TILE_PIXELS / 8)) / 2;
    expect(bottom).toBeLessThan(bossTop + 1);
  });

  it("rises as it ages, smoothly between ticks", () => {
    const { world, view } = setup();
    const e = addText(world, { age: 0.2, previousAge: 0.1 });

    const halfway = bottomOf(draw(world, view, 0.5)[0]);
    world.components.floatingText.get(e)!.previousAge = 0;
    world.components.floatingText.get(e)!.age = 0;
    const start = bottomOf(draw(world, view)[0]);

    // 0.15 s into 0.8 s, eased out over a 1.25-tile rise.
    const progress = 0.15 / 0.8;
    const eased = 1 - (1 - progress) ** 2;
    expect(start - halfway).toBeCloseTo(1.25 * eased * TILE_PIXELS, 3);
  });

  it("uses its moving target's interpolated position directly", () => {
    const { world, view } = setup();
    const target = spawn(world);
    world.components.previousPosition.set(target, { x: 8, y: 10 });
    world.components.position.set(target, { x: 12, y: 10 });
    const text = addText(world, { follows: target });
    // Deliberately give the text a stale copy: its drawing anchor must still
    // be exactly halfway along the target's own path at alpha 0.5.
    world.components.previousPosition.set(text, { x: 0, y: 0 });
    world.components.position.set(text, { x: 0, y: 0 });

    const [first, second] = draw(world, view, 0.5);
    const firstInk = first.corners[0].x + 0.2 * FONT;
    const lastInk = second.corners[0].x + (0.2 + 6) * FONT;
    const center = (firstInk + lastInk) / 2;
    expect(center).toBeCloseTo(worldToScreen(view, CENTER).x, 3);
  });

  it("holds still after its target disappears", () => {
    const { world, view } = setup();
    const target = spawn(world);
    world.components.position.set(target, { x: 12, y: 10 });
    const text = addText(world, { follows: target });
    world.components.previousPosition.set(text, { x: 8, y: 10 });
    world.components.position.set(text, { x: 12, y: 10 });
    world.components.position.delete(target);
    floatingTextSystem(world, 0.05);

    const atStart = draw(world, view, 0)[0].corners[0].x;
    const atEnd = draw(world, view, 1)[0].corners[0].x;

    expect(atStart).toBeCloseTo(atEnd, 3);
  });

  it("rises its full distance by the end of its life", () => {
    const { world, view } = setup();
    const e = addText(world);
    const start = bottomOf(draw(world, view)[0]);
    const t = world.components.floatingText.get(e)!;
    t.age = t.previousAge = 0.8;
    expect(start - bottomOf(draw(world, view)[0])).toBeCloseTo(
      1.25 * TILE_PIXELS,
      3,
    );
  });

  it("leaves room for the next damage number a quarter second later", () => {
    // The real damage text settings, at the player's 4 shots a second.
    const { world, view } = setup();
    const { lifetime, rise } = DAMAGE_TEXT;
    addText(world, { lifetime, rise, age: 0.25, previousAge: 0.25 });
    addText(world, { lifetime, rise });
    const [older, , newer] = draw(world, view);
    const glyphTall = 8 * FONT;
    expect(bottomOf(newer) - bottomOf(older)).toBeGreaterThan(glyphTall);
  });

  it("starts higher by its lift", () => {
    const { world, view } = setup();
    addText(world);
    addText(world, { lift: 0.35 });
    const [low, high] = draw(world, view).filter((_, i) => i % 2 === 0);
    expect(bottomOf(low) - bottomOf(high)).toBeCloseTo(0.35 * TILE_PIXELS, 3);
  });

  it("rises up the screen whichever way the camera faces", () => {
    const { world, view } = setup(Math.PI / 2);
    addText(world, { age: 0.4, previousAge: 0.4 });
    const [glyph] = draw(world, view);
    const at = worldToScreen(view, CENTER);
    expect(glyph.corners[0].y).toBeLessThan(at.y);
    expect(glyph.corners[0].y).toBeCloseTo(glyph.corners[1].y, 3);
  });

  it("is tinted its color and outlined in black", () => {
    const { world, view } = setup();
    addText(world, { color: [1, 0, 0, 1] });
    const [glyph] = draw(world, view);
    expect(glyph.tint).toEqual([1, 0, 0, 1]);
    expect(glyph.outline).toEqual([0, 0, 0, 1]);
  });

  it("fades out over the last third of its life", () => {
    const { world, view } = setup();
    const e = addText(world);
    const opacityAt = (age: number) => {
      const t = world.components.floatingText.get(e)!;
      t.age = t.previousAge = age;
      return draw(world, view)[0].tint[3];
    };
    expect(opacityAt(0.5)).toBeCloseTo(1);
    // Two thirds of 0.8 s is 0.533; halfway through the fade is 0.667.
    expect(opacityAt(0.8 * (5 / 6))).toBeCloseTo(0.5, 3);
    expect(opacityAt(0.8)).toBeCloseTo(0, 3);
  });

  it("skips characters it has no glyph for", () => {
    const { world, view } = setup();
    addText(world, { text: "1x2" });
    expect(draw(world, view).map(digitOf)).toEqual(["1", "2"]);
  });

  it("skips text off screen", () => {
    const { world, view } = setup();
    const e = addText(world);
    world.components.position.set(e, { x: 40, y: 10 });
    expect(draw(world, view)).toHaveLength(0);
  });
});
