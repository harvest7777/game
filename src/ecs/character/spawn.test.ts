import { describe, expect, it } from "vitest";
import { testCharacter, testItem } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld } from "../world";
import { spawnCharacter } from "./spawn";
import { STAT } from "../stats/components";

function setup(changes: Parameters<typeof testCharacter>[0] = {}) {
  const world = createWorld(createTiles(20, 20));
  const def = testCharacter(changes);
  const entity = spawnCharacter(world, def, { x: 5, y: 6 });
  return { def, entity, c: world.components };
}

describe("spawnCharacter", () => {
  it("is a player-controlled movable on the player team at full health", () => {
    const { def, entity, c } = setup();

    expect(c.position.get(entity)).toEqual({ x: 5, y: 6 });
    expect(c.hitbox.get(entity)).toEqual(def.hitbox);
    expect(c.playerControlled.has(entity)).toBe(true);
    expect(c.moveSpeed.has(entity)).toBe(false);
    expect(c.team.get(entity)).toBe("player");
    expect(c.health.get(entity)).toEqual(def.stats[STAT.HEALTH]);
  });

  it("remembers its class and draws its art on the player layer", () => {
    const { def, entity, c } = setup();
    expect(c.character.get(entity)).toEqual({ def });
    expect(c.sprite.get(entity)).toEqual({
      art: def.sprite.art,
      layer: "player",
    });
  });

  it("wears its starting weapon, armed to fire it", () => {
    const staff = testItem({ name: "Staff" });
    const { entity, c } = setup({ startingWeapon: staff });
    expect(c.equipment.get(entity)!.weapon).toEqual({ def: staff });
    expect(c.shooter.get(entity)!.weapon).toBe(staff.weapon);
  });

  it("doesn't share the definition's objects", () => {
    const { def, entity, c } = setup({
      sprite: {
        art: { kind: "static", file: "test/character" },
        outline: { color: [0, 0, 0, 1] },
      },
    });

    c.hitbox.get(entity)!.r = 99;
    c.sprite.get(entity)!.outline!.color[0] = 0.5;

    expect(def.hitbox.r).not.toBe(99);
    expect(def.sprite.outline!.color[0]).toBe(0);
  });
});
