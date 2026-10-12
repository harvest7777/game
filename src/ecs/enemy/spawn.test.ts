import { describe, expect, it } from "vitest";
import { createTiles, isWall, setWall } from "../tiles";
import { createWorld } from "../world";
import { testEnemy, testWeapon } from "../../testing/defs";
import type { EnemyDef } from "./definitions";
import { spawnCrowd, spawnEnemy } from "./spawn";
import { STAT } from "../stats/components";

const SLIME = testEnemy({ weapon: testWeapon() });

function spawnAt(def: EnemyDef) {
  const world = createWorld(createTiles(20, 20));
  const entity = spawnEnemy(world, def, { x: 5, y: 6 });
  return { world, entity, c: world.components };
}

describe("spawnEnemy", () => {
  it("is a movable on the enemy team with full health", () => {
    const { entity, c } = spawnAt(SLIME);

    expect(c.position.get(entity)).toEqual({ x: 5, y: 6 });
    expect(c.hitbox.get(entity)).toEqual(SLIME.hitbox);
    expect(c.health.get(entity)).toEqual(SLIME.stats[STAT.HEALTH]);
    expect(c.team.get(entity)).toBe("enemy");
  });

  it("rolls its own speed within 10% of its kind's, and its quirks", () => {
    const at = (roll: number) => {
      const world = createWorld(createTiles(20, 20), () => roll);
      const entity = spawnEnemy(world, SLIME, { x: 5, y: 6 });
      return {
        speed: world.components.moveSpeed.get(entity)!,
        quirks: world.components.enemy.get(entity)!.quirks,
      };
    };
    expect(at(0).speed).toBeCloseTo(SLIME.speed * 0.9);
    expect(at(0.999).speed).toBeCloseTo(SLIME.speed * 1.1, 2);
    expect(at(0).quirks).toEqual({ reach: 0.8, flipOrbit: true });
    expect(at(0.999).quirks).toMatchObject({ flipOrbit: false });
    expect(at(0.999).quirks!.reach).toBeCloseTo(1.2, 2);
  });

  it("remembers what it is and where it was spawned", () => {
    const { entity, c } = spawnAt(SLIME);
    expect(c.enemy.get(entity)).toMatchObject({
      def: SLIME,
      origin: { x: 5, y: 6 },
    });
  });

  it("starts out idle with a fresh memory", () => {
    const { entity, c } = spawnAt(SLIME);
    expect(c.brain.get(entity)).toEqual({ mode: "idle", memory: { time: 0 } });
  });

  it("draws its art on the enemy layer", () => {
    const { entity, c } = spawnAt(SLIME);
    expect(c.sprite.get(entity)).toMatchObject({
      art: SLIME.sprite.art,
      layer: "enemy",
    });
  });

  it("carries its weapon when it has one", () => {
    const armed = spawnAt(SLIME);
    expect(armed.c.shooter.get(armed.entity)!.weapon).toBe(SLIME.weapon);
    expect(armed.c.team.get(armed.entity)).toBe("enemy");

    const unarmed = spawnAt(testEnemy());
    expect(unarmed.c.shooter.has(unarmed.entity)).toBe(false);
  });

  it("doesn't share the definition's objects", () => {
    const { entity, c } = spawnAt(SLIME);

    c.hitbox.get(entity)!.r = 99;
    c.sprite.get(entity)!.outline!.color[0] = 0.5;

    expect(SLIME.hitbox.r).not.toBe(99);
    expect(SLIME.sprite.outline!.color[0]).toBe(0);
  });
});

describe("spawnCrowd", () => {
  function crowd(count: number) {
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const world = createWorld(createTiles(60, 60), random);
    // A wall through the middle of where they land.
    for (let y = 0; y < 60; y++) setWall(world.tiles, 30, y);
    const spawned = spawnCrowd(world, SLIME, { x: 30, y: 30 }, count);
    return { world, spawned };
  }

  it("spawns that many, loosely around the center, never on a wall", () => {
    const { world, spawned } = crowd(400);
    // A few may be given up on next to the wall, but hardly any.
    expect(spawned.length).toBeGreaterThan(390);
    const radius = Math.sqrt(400 / (0.5 * Math.PI));
    for (const e of spawned) {
      const at = world.components.position.get(e)!;
      expect(Math.hypot(at.x - 30, at.y - 30)).toBeLessThanOrEqual(radius);
      expect(isWall(world.tiles, Math.floor(at.x), Math.floor(at.y))).toBe(
        false,
      );
    }
  });

  it("spreads a bigger crowd wider", () => {
    const farthest = (count: number) => {
      const { world, spawned } = crowd(count);
      return Math.max(
        ...spawned.map((e) => {
          const at = world.components.position.get(e)!;
          return Math.hypot(at.x - 30, at.y - 30);
        }),
      );
    };
    expect(farthest(400)).toBeGreaterThan(farthest(25) * 2);
  });
});

describe("spawnEnemy quests", () => {
  it("marks an enemy that's a quest", () => {
    const world = createWorld(createTiles(10, 10));
    const boss = spawnEnemy(world, testEnemy({ quest: true }), { x: 2, y: 2 });
    const slime = spawnEnemy(world, testEnemy(), { x: 3, y: 3 });
    expect(world.components.quest.has(boss)).toBe(true);
    expect(world.components.quest.has(slime)).toBe(false);
  });
});
