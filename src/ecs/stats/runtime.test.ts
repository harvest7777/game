import { describe, expect, it } from "vitest";
import { testItem } from "../../testing/defs";
import { addHoldings } from "../inventory/bundle";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { STAT, STAT_KINDS, stat } from "./components";
import {
  clampResources,
  damageMultiplier,
  effectiveResourceMax,
  effectiveStatNumber,
  movementSpeed,
  shotsPerSecond,
} from "./runtime";

describe("effective stats", () => {
  it("adds equipped bonuses for all eight stats without changing base stats", () => {
    const world = createWorld(createTiles(1, 1));
    const entity = spawn(world);
    for (const kind of STAT_KINDS) {
      world.components[kind].set(entity, stat(10, 100));
    }
    const armor = testItem({
      kind: "armor",
      bonuses: Object.fromEntries(STAT_KINDS.map((kind) => [kind, 2])),
    });
    const ring = testItem({
      kind: "ring",
      bonuses: Object.fromEntries(STAT_KINDS.map((kind) => [kind, 3])),
    });
    addHoldings(world, entity, { equipment: { armor, ring } });

    for (const kind of STAT_KINDS) {
      expect(world.components[kind].get(entity)).toEqual(stat(10, 100));
    }
    expect(effectiveResourceMax(world, entity, STAT.HEALTH)).toBe(105);
    expect(effectiveResourceMax(world, entity, STAT.MANA)).toBe(105);
    expect(effectiveStatNumber(world, entity, STAT.ATTACK)).toBe(15);
    expect(effectiveStatNumber(world, entity, STAT.WISDOM)).toBe(15);
  });

  it("uses equipment in movement, damage and firing formulas", () => {
    const world = createWorld(createTiles(1, 1));
    const entity = spawn(world);
    world.components.speed.set(entity, stat(25, 75));
    world.components.attack.set(entity, stat(25, 75));
    world.components.dexterity.set(entity, stat(25, 75));
    const ring = testItem({
      kind: "ring",
      bonuses: { speed: 25, attack: 25, dexterity: 25 },
    });
    addHoldings(world, entity, { equipment: { ring } });

    expect(movementSpeed(world, entity)).toBe(6);
    expect(damageMultiplier(world, entity)).toBe(1.5);
    expect(shotsPerSecond(world, entity, 4)).toBe(5);
  });

  it("clamps current resources only when effective capacity falls", () => {
    const world = createWorld(createTiles(1, 1));
    const entity = spawn(world);
    world.components.health.set(entity, { value: 140, max: 100 });
    world.components.mana.set(entity, { value: 90, max: 80 });
    const ring = testItem({
      kind: "ring",
      bonuses: { health: 50, mana: 20 },
    });
    addHoldings(world, entity, { equipment: { ring } });

    clampResources(world, entity);
    expect(world.components.health.get(entity)!.value).toBe(140);
    expect(world.components.mana.get(entity)!.value).toBe(90);

    world.components.equipment.get(entity)!.ring = null;
    clampResources(world, entity);
    expect(world.components.health.get(entity)!.value).toBe(100);
    expect(world.components.mana.get(entity)!.value).toBe(80);
  });
});
