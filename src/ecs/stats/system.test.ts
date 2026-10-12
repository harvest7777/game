import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { STAT, STAT_KINDS, stat } from "./components";
import { statSystem } from "./system";

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

  it("maxes every present player stat through a command", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    world.components.playerControlled.set(player, true);
    for (const kind of STAT_KINDS) {
      world.components[kind].set(player, stat(1, 10));
    }
    world.input.commands = [{ kind: "maxStats" }];

    statSystem(world, 0);

    for (const kind of STAT_KINDS) {
      expect(world.components[kind].get(player)!.value).toBe(10);
    }
    expect(world.components[STAT.HEALTH].get(player)!.max).toBe(10);
  });
});
