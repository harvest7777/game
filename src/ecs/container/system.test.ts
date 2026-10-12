import { describe, expect, it } from "vitest";
import { testItem } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn, type World } from "../world";
import { containerAccessSystem } from "./system";

const ITEM = { def: testItem({ name: "Loot" }) };

function addPlayer(world: World, x: number, y: number) {
  const entity = spawn(world);
  world.components.playerControlled.set(entity, true);
  world.components.position.set(entity, { x, y });
  return entity;
}

function addContainer(world: World, x: number, y: number, radius = 0.75) {
  const entity = spawn(world);
  world.components.position.set(entity, { x, y });
  world.components.container.set(entity, { slots: [ITEM] });
  world.components.proximityContainer.set(entity, { radius });
  return entity;
}

describe("containerAccessSystem", () => {
  it("opens the nearest container the player is standing over", () => {
    const world = createWorld(createTiles(4, 4));
    const player = addPlayer(world, 2, 2);
    addContainer(world, 2.5, 2);
    const nearest = addContainer(world, 2.2, 2);

    containerAccessSystem(world, 0.05);

    expect(world.components.containerAccess.get(player)).toEqual({
      container: nearest,
    });
  });

  it("closes access after the player walks away", () => {
    const world = createWorld(createTiles(4, 4));
    const player = addPlayer(world, 2, 2);
    addContainer(world, 2.2, 2);
    containerAccessSystem(world, 0.05);
    world.components.position.set(player, { x: 0, y: 0 });

    containerAccessSystem(world, 0.05);

    expect(world.components.containerAccess.has(player)).toBe(false);
  });

  it("ignores empty containers and ones queued to despawn", () => {
    const world = createWorld(createTiles(4, 4));
    const player = addPlayer(world, 2, 2);
    const despawning = addContainer(world, 2, 2);
    const empty = addContainer(world, 2, 2);
    world.components.container.get(empty)!.slots[0] = null;
    world.events.despawns.push(despawning);

    containerAccessSystem(world, 0.05);

    expect(world.components.containerAccess.has(player)).toBe(false);
  });
});
