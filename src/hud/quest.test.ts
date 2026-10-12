import { describe, expect, it } from "vitest";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import { addSprite } from "../ecs/bundles";
import { createCamera } from "../ecs/camera/resource";
import type { Art } from "../render/art";
import { QUEST_ARROW } from "../render/assets";
import { QuadBuffer, readQuads, type Quad } from "../render/quads";
import { createView } from "../render/view";
import { currentQuest, pushQuestPointer, questPointer } from "./quest";

const SCREEN = { w: 200, h: 100 };
const INSET = 10;

describe("currentQuest", () => {
  it("is the nearest quest, ignoring anything that isn't one", () => {
    const world = createWorld(createTiles(1, 1));
    const far = spawn(world);
    const near = spawn(world);
    const notAQuest = spawn(world);
    world.components.position.set(far, { x: 50, y: 0 });
    world.components.position.set(near, { x: 10, y: 0 });
    world.components.position.set(notAQuest, { x: 1, y: 0 });
    world.components.quest.set(far, true);
    world.components.quest.set(near, true);

    expect(currentQuest(world, { x: 0, y: 0 })).toBe(near);
  });

  it("with no quest, is undefined", () => {
    const world = createWorld(createTiles(1, 1));
    expect(currentQuest(world, { x: 0, y: 0 })).toBeUndefined();
  });
});

describe("questPointer", () => {
  it("hides while the quest is on screen", () => {
    expect(questPointer({ x: 150, y: 20 }, SCREEN, INSET)).toBeUndefined();
  });

  it("sits on the right edge, pointing right, for a quest off to the right", () => {
    expect(questPointer({ x: 500, y: 50 }, SCREEN, INSET)).toEqual({
      x: 190,
      y: 50,
      angle: 0,
    });
  });

  it("sits on the top edge, pointing up, for a quest above", () => {
    const pointer = questPointer({ x: 100, y: -300 }, SCREEN, INSET)!;
    expect(pointer.x).toBeCloseTo(100);
    expect(pointer.y).toBeCloseTo(10);
    expect(pointer.angle).toBeCloseTo(-Math.PI / 2);
  });

  it("follows the line toward the quest to whichever edge it meets first", () => {
    // Down and to the right at 45°: the bottom edge (40 below the middle)
    // comes before the right edge (90 across).
    const pointer = questPointer({ x: 400, y: 350 }, SCREEN, INSET)!;
    expect(pointer.x).toBeCloseTo(140);
    expect(pointer.y).toBeCloseTo(90);
    expect(pointer.angle).toBeCloseTo(Math.PI / 4);
  });
});

describe("pushQuestPointer", () => {
  const ARROW = { x: 10, y: 0, w: 8, h: 8 };
  const glyphs = "0123456789m";
  const art: Art = {
    manifest: {
      sprites: [],
      walls: { top: "top", side: "side" },
      fonts: {
        bold: {},
        regular: Object.fromEntries([...glyphs].map((c) => [c, `g${c}`])),
      },
    },
    regions: new Map([
      [QUEST_ARROW, ARROW],
      ["boss", { x: 20, y: 0, w: 8, h: 8 }],
      ...[...glyphs].map(
        (c, i) => [`g${c}`, { x: 100 + i * 10, y: 0, w: 8, h: 8 }] as const,
      ),
    ]),
    glyphs: new Map([...glyphs].map((c) => [`g${c}`, { left: 0, width: 5 }])),
  };

  // A player at (10, 10) seeing 5 tiles either way, and a boss `bossAt`.
  function scene(bossAt: { x: number; y: number }) {
    const world = createWorld(createTiles(100, 100));
    const player = spawn(world);
    world.components.position.set(player, { x: 10, y: 10 });
    const boss = spawn(world);
    world.components.position.set(boss, bossAt);
    world.components.quest.set(boss, true);
    addSprite(world, boss, {
      art: { kind: "static", file: "boss" },
      layer: "enemy",
    });
    world.components.health.set(boss, { value: 50, max: 100 });
    const view = createView(createCamera(), { x: 10, y: 10 }, 400, 400);
    const out = new QuadBuffer();
    pushQuestPointer(out, art, world, player, view, 1, 2);
    return readQuads(out);
  }
  const isArrow = (q: Quad) => q.region.x === ARROW.x;

  it("draws nothing while the boss is in view", () => {
    expect(scene({ x: 12, y: 10 })).toEqual([]);
  });

  it("draws the arrow, portrait and distance while the boss is off screen", () => {
    const quads = scene({ x: 50, y: 10 });
    expect(quads.filter(isArrow)).toHaveLength(1);
    expect(quads.some((q) => q.region.x === 20)).toBe(true);
    // "40m": 40 tiles east.
    const text = quads.filter((q) => q.region.x >= 100);
    expect(text).toHaveLength(3);
  });

  it("points the arrow toward the boss, near the screen's right edge", () => {
    const [arrow] = scene({ x: 50, y: 10 }).filter(isArrow);
    const xs = arrow.corners.map((c) => c.x);
    expect(Math.max(...xs)).toBeLessThanOrEqual(400);
    expect(Math.min(...xs)).toBeGreaterThan(300);
  });
});
