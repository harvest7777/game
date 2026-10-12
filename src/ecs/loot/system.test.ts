import { describe, expect, it } from "vitest";
import { spawnEnemy } from "../enemy/spawn";
import { itemTier } from "../inventory/items";
import { createTiles, setWall } from "../tiles";
import { createWorld } from "../world";
import { BAG_DROP_DISTANCE } from "./spawn";
import { testEnemy, testItem } from "../../testing/defs";
import {
  defineLootBag,
  drop,
  exactItem,
  itemQuery,
  lootTable,
} from "./definitions";
import { createLootRuntime } from "./runtime";
import { lootBagSystem, lootSystem } from "./system";

const item = testItem({ name: "Drop" });
const table = lootTable(drop(exactItem(item)));
const bag = defineLootBag({
  name: "Bag",
  art: { kind: "static", file: "test/bag" },
  priority: 1,
  capacity: 8,
  lifetime: 10,
  matches: itemQuery({ tier: { min: itemTier(1), max: itemTier(1) } }),
});
const loot = createLootRuntime({ items: [item], tables: [table], bags: [bag] });

describe("lootSystem", () => {
  it("turns an enemy death into a container beside where it died", () => {
    const world = createWorld(createTiles(10, 10), () => 0, loot);
    const enemy = spawnEnemy(world, testEnemy({ loot: table }), { x: 4, y: 6 });
    world.events.deaths.push({ entity: enemy });

    lootSystem(world, 0.05);

    const [[bagEntity, state]] = [...world.components.lootBag];
    expect(state).toEqual({ def: bag, previousAge: 0, age: 0 });
    // Random 0: the shortest drop distance, due east.
    expect(world.components.position.get(bagEntity)).toEqual({
      x: 4 + BAG_DROP_DISTANCE[0],
      y: 6,
    });
    expect(world.components.container.get(bagEntity)?.slots).toEqual([
      { def: item },
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });
});

describe("lootBagSystem", () => {
  it("ages bags and queues them when their definition expires", () => {
    const world = createWorld(createTiles(10, 10), () => 0, loot);
    const enemy = spawnEnemy(world, testEnemy({ loot: table }), { x: 4, y: 6 });
    world.events.deaths.push({ entity: enemy });
    lootSystem(world, 0.05);
    const bagEntity = [...world.components.lootBag][0][0];

    lootBagSystem(world, 10);

    expect(world.components.lootBag.get(bagEntity)).toMatchObject({
      previousAge: 0,
      age: 10,
    });
    expect(world.events.despawns).toContain(bagEntity);
  });

  it("queues an emptied bag for cleanup", () => {
    const world = createWorld(createTiles(10, 10), () => 0, loot);
    const enemy = spawnEnemy(world, testEnemy({ loot: table }), { x: 4, y: 6 });
    world.events.deaths.push({ entity: enemy });
    lootSystem(world, 0.05);
    const bagEntity = [...world.components.lootBag][0][0];
    world.components.container.get(bagEntity)!.slots.fill(null);

    lootBagSystem(world, 0.05);

    expect(world.events.despawns).toContain(bagEntity);
  });
});

describe("bag drops", () => {
  function drop(random: () => number, walls: [number, number][] = []) {
    const tiles = createTiles(10, 10);
    for (const [x, y] of walls) setWall(tiles, x, y);
    const world = createWorld(tiles, random, loot);
    const enemy = spawnEnemy(world, testEnemy({ loot: table }), {
      x: 4.5,
      y: 4.5,
    });
    world.events.deaths.push({ entity: enemy });
    lootSystem(world, 0.05);
    const [[bagEntity]] = [...world.components.lootBag];
    return world.components.position.get(bagEntity)!;
  }

  it("lands half a tile to a tile from where the enemy died", () => {
    for (let i = 0; i < 50; i++) {
      const at = drop(Math.random);
      const distance = Math.hypot(at.x - 4.5, at.y - 4.5);
      expect(distance).toBeGreaterThanOrEqual(BAG_DROP_DISTANCE[0] - 1e-9);
      expect(distance).toBeLessThanOrEqual(BAG_DROP_DISTANCE[1]);
    }
  });

  it("never lands in a wall", () => {
    // Walls all round but the tile due south.
    const ring: [number, number][] = [
      [3, 3],
      [4, 3],
      [5, 3],
      [3, 4],
      [5, 4],
      [3, 5],
      [5, 5],
    ];
    for (let i = 0; i < 50; i++) {
      const at = drop(Math.random, ring);
      const tile = [Math.floor(at.x), Math.floor(at.y)];
      expect(ring).not.toContainEqual(tile);
    }
  });
});

describe("bag drop sound", () => {
  it("plays once where the enemy died when it drops anything", () => {
    const world = createWorld(createTiles(10, 10), () => 0, loot);
    const enemy = spawnEnemy(world, testEnemy({ loot: table }), { x: 4, y: 6 });
    world.events.deaths.push({ entity: enemy });

    lootSystem(world, 0.05);

    expect(world.events.soundCues).toEqual([
      { sound: "bagDrop", at: { x: 4, y: 6 } },
    ]);
  });
});
