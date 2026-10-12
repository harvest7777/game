import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { STAT, STAT_KINDS, stat } from "./components";
import { statSystem } from "./system";
import { testItem } from "../../testing/defs";
import { addHoldings } from "../inventory/bundle";

describe("statSystem", () => {
  it("regenerates Health and Mana without passing their caps", () => {
    const world = createWorld(createTiles(1, 1));
    const entity = spawn(world);
    world.components.health.set(entity, stat(99.5, 100));
    world.components.vitality.set(entity, stat(10, 75));
    world.components.mana.set(entity, stat(98, 100));
    world.components.wisdom.set(entity, stat(25, 75));

    statSystem(world, 1);

    expect(world.components.health.get(entity)!.value).toBe(100);
    expect(world.components.mana.get(entity)!.value).toBe(100);
  });

  it("does not regenerate something dead", () => {
    const world = createWorld(createTiles(1, 1));
    const entity = spawn(world);
    world.components.health.set(entity, stat(0, 100));
    world.components.vitality.set(entity, stat(75));
    world.components.mana.set(entity, stat(50, 100));
    world.components.wisdom.set(entity, stat(75));

    statSystem(world, 1);

    expect(world.components.health.get(entity)!.value).toBe(0);
    expect(world.components.mana.get(entity)!.value).toBe(50);
  });

  it("uses equipment bonuses for regeneration and resource capacity", () => {
    const world = createWorld(createTiles(1, 1));
    const entity = spawn(world);
    world.components.health.set(entity, stat(100, 100));
    world.components.vitality.set(entity, stat(10, 75));
    world.components.mana.set(entity, stat(80, 80));
    world.components.wisdom.set(entity, stat(20, 75));
    const ring = testItem({
      kind: "ring",
      weapon: undefined,
      bonuses: { health: 20, mana: 20, vitality: 10, wisdom: 10 },
    });
    addHoldings(world, entity, { equipment: { ring } });

    statSystem(world, 1);

    expect(world.components.health.get(entity)!.value).toBe(102);
    expect(world.components.mana.get(entity)!.value).toBe(83);
  });

  it("maxes every present player stat through a command", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    world.components.playerControlled.set(player, true);
    for (const kind of STAT_KINDS) {
      world.components[kind].set(player, stat(1, 10));
    }
    const ring = testItem({
      kind: "ring",
      weapon: undefined,
      bonuses: { health: 5, mana: 7, attack: 2 },
    });
    addHoldings(world, player, { equipment: { ring } });
    world.input.commands = [{ kind: "maxStats" }];

    statSystem(world, 0);

    expect(world.components.health.get(player)!.value).toBe(15);
    expect(world.components.mana.get(player)!.value).toBe(17);
    for (const kind of STAT_KINDS.slice(2)) {
      expect(world.components[kind].get(player)!.value).toBe(10);
    }
    expect(world.components[STAT.HEALTH].get(player)!.max).toBe(10);
  });
});
