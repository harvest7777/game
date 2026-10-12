import { describe, expect, it } from "vitest";
import { testEnemy } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { brainSystem } from "./brain";
import { separation, SPACING, withSeparation } from "./separation";
import { spawnEnemy } from "./spawn";

// Slimes have 0.4-tile hitboxes, so they ease apart within 0.8 + SPACING.
const SLIME = testEnemy({ hitbox: { r: 0.4 } });
const REACH = 0.8 + SPACING;

function world() {
  return createWorld(createTiles(40, 40), () => 0.5);
}

describe("separation", () => {
  it("pushes crowded enemies straight apart, equally", () => {
    const w = world();
    const a = spawnEnemy(w, SLIME, { x: 10, y: 10 });
    const b = spawnEnemy(w, SLIME, { x: 10.5, y: 10 });

    const pushes = separation(w);

    const closeness = 1 - 0.5 / REACH;
    expect(pushes.get(a)!.x).toBeCloseTo(-closeness);
    expect(pushes.get(a)!.y).toBeCloseTo(0);
    expect(pushes.get(b)!.x).toBeCloseTo(closeness);
  });

  it("leaves enemies with room alone", () => {
    const w = world();
    spawnEnemy(w, SLIME, { x: 10, y: 10 });
    spawnEnemy(w, SLIME, { x: 10 + REACH + 0.01, y: 10 });
    expect(separation(w).size).toBe(0);
  });

  it("finds neighbors across grid cells", () => {
    const w = world();
    // The grid starts at the top-left enemy and its cells are REACH wide,
    // so these two are either side of a cell boundary, both ways.
    spawnEnemy(w, SLIME, { x: 1, y: 1 });
    const edge = 1 + REACH * 5;
    const a = spawnEnemy(w, SLIME, { x: edge - 0.1, y: edge - 0.1 });
    const b = spawnEnemy(w, SLIME, { x: edge + 0.1, y: edge + 0.1 });
    const pushes = separation(w);
    expect(pushes.get(a)!.x).toBeLessThan(0);
    expect(pushes.get(b)!.y).toBeGreaterThan(0);
  });

  it("splits enemies exactly on top of each other opposite ways", () => {
    const w = world();
    const a = spawnEnemy(w, SLIME, { x: 10, y: 10 });
    const b = spawnEnemy(w, SLIME, { x: 10, y: 10 });

    const pushes = separation(w);
    const pa = pushes.get(a)!;
    const pb = pushes.get(b)!;
    expect(Math.hypot(pa.x, pa.y)).toBeCloseTo(1);
    expect(pa.x).toBeCloseTo(-pb.x);
    expect(pa.y).toBeCloseTo(-pb.y);
  });

  it("only spaces enemies from each other, not the player", () => {
    const w = world();
    spawnEnemy(w, SLIME, { x: 10, y: 10 });
    const player = spawn(w);
    w.components.position.set(player, { x: 10.2, y: 10 });
    w.components.hitbox.set(player, { r: 0.4 });
    expect(separation(w).size).toBe(0);
  });
});

describe("withSeparation", () => {
  it("adds the push, scaled by speed", () => {
    expect(withSeparation({ x: 0, y: 0 }, { x: 0.2, y: 0 }, 2)).toEqual({
      x: 0.2 * 2 * 1.5,
      y: 0,
    });
  });

  it("never goes faster than the enemy can", () => {
    const v = withSeparation({ x: 2, y: 0 }, { x: 0, y: 3 }, 2);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(2);
  });

  it("lets a dash keep its own speed", () => {
    const v = withSeparation({ x: 7, y: 0 }, { x: 0, y: 1 }, 2);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(7);
  });
});

describe("in the brain", () => {
  it("spreads a pile of chasers out around their target", () => {
    const w = world();
    const player = spawn(w);
    w.components.position.set(player, { x: 20, y: 20 });
    w.components.team.set(player, "player");
    const pile = Array.from({ length: 6 }, () =>
      spawnEnemy(w, SLIME, { x: 14, y: 20 }),
    );
    for (const e of pile) w.components.target.set(e, player);

    for (let i = 0; i < 100; i++) {
      brainSystem(w, 0.05);
      for (const e of pile) {
        const at = w.components.position.get(e)!;
        const v = w.components.velocity.get(e)!;
        at.x += v.x * 0.05;
        at.y += v.y * 0.05;
      }
    }

    const at = pile.map((e) => w.components.position.get(e)!);
    for (let i = 0; i < at.length; i++) {
      for (let j = i + 1; j < at.length; j++) {
        const gap = Math.hypot(at[i].x - at[j].x, at[i].y - at[j].y);
        expect(gap).toBeGreaterThan(0.8);
      }
    }
  });

  it("doesn't push stationary enemies", () => {
    const still = { kind: "stationary" } as const;
    const DUMMY = testEnemy({ idle: still, aggro: still });
    const w = world();
    const a = spawnEnemy(w, DUMMY, { x: 10, y: 10 });
    spawnEnemy(w, DUMMY, { x: 10.1, y: 10 });
    brainSystem(w, 0.05);
    expect(w.components.velocity.get(a)).toEqual({ x: 0, y: 0 });
  });
});
