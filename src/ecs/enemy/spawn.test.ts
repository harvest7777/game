import { describe, expect, it } from "vitest";
import { createTiles, isWall, setWall } from "../tiles";
import { createWorld } from "../world";
import { enemies } from "./definitions";
import { spawnCrowd, spawnEnemy } from "./spawn";

function spawnAt(id: "slime" | "dummy") {
  const world = createWorld(createTiles(20, 20));
  const entity = spawnEnemy(world, id, { x: 5, y: 6 });
  return { world, entity, c: world.components };
}

describe("spawnEnemy", () => {
  it("is a movable on the enemy team with full health", () => {
    const { entity, c } = spawnAt("slime");

    expect(c.position.get(entity)).toEqual({ x: 5, y: 6 });
    expect(c.hitbox.get(entity)).toEqual(enemies.slime.hitbox);
    expect(c.health.get(entity)).toEqual({ hp: 150, max: 150 });
    expect(c.team.get(entity)).toBe("enemy");
  });

  it("rolls its own speed within 10% of its kind's, and its quirks", () => {
    const at = (roll: number) => {
      const world = createWorld(createTiles(20, 20), () => roll);
      const entity = spawnEnemy(world, "slime", { x: 5, y: 6 });
      return {
        speed: world.components.speed.get(entity)!,
        quirks: world.components.enemy.get(entity)!.quirks,
      };
    };
    expect(at(0).speed).toBeCloseTo(enemies.slime.speed * 0.9);
    expect(at(0.999).speed).toBeCloseTo(enemies.slime.speed * 1.1, 2);
    expect(at(0).quirks).toEqual({ reach: 0.8, flipOrbit: true });
    expect(at(0.999).quirks).toMatchObject({ flipOrbit: false });
    expect(at(0.999).quirks!.reach).toBeCloseTo(1.2, 2);
  });

  it("remembers what it is and where it was spawned", () => {
    const { entity, c } = spawnAt("slime");
    expect(c.enemy.get(entity)).toMatchObject({
      def: "slime",
      origin: { x: 5, y: 6 },
    });
  });

  it("starts out idle with a fresh memory", () => {
    const { entity, c } = spawnAt("slime");
    expect(c.brain.get(entity)).toEqual({ mode: "idle", memory: { time: 0 } });
  });

  it("draws on the enemy layer", () => {
    const { entity, c } = spawnAt("slime");
    expect(c.sprite.get(entity)).toMatchObject({
      name: "slime",
      layer: "enemy",
    });
  });

  it("carries its weapon when it has one", () => {
    const armed = spawnAt("slime");
    expect(armed.c.shooter.get(armed.entity)!.weapon).toBe("slimeSpit");
    expect(armed.c.team.get(armed.entity)).toBe("enemy");

    const unarmed = spawnAt("dummy");
    expect(unarmed.c.shooter.has(unarmed.entity)).toBe(false);
  });

  it("doesn't share the definition's objects", () => {
    const { entity, c } = spawnAt("slime");

    c.hitbox.get(entity)!.r = 99;
    c.sprite.get(entity)!.outline!.color[0] = 0.5;

    expect(enemies.slime.hitbox.r).not.toBe(99);
    expect(enemies.slime.sprite.outline.color[0]).toBe(0);
  });
});

describe("spawnCrowd", () => {
  function crowd(count: number) {
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const world = createWorld(createTiles(60, 60), random);
    // A wall through the middle of where they land.
    for (let y = 0; y < 60; y++) setWall(world.tiles, 30, y);
    const spawned = spawnCrowd(world, "slime", { x: 30, y: 30 }, count);
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
