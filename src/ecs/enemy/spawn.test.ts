import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld } from "../world";
import { enemies } from "./definitions";
import { spawnEnemy } from "./spawn";

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
    expect(c.speed.get(entity)).toBe(enemies.slime.speed);
  });

  it("remembers what it is and where it was spawned", () => {
    const { entity, c } = spawnAt("slime");
    expect(c.enemy.get(entity)).toEqual({
      def: "slime",
      origin: { x: 5, y: 6 },
    });
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
