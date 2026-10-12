import { spawnEnemy } from "../enemy/spawn";
import { spawnPortal } from "../portal/spawn";
import type { Vec2 } from "../shared/physics/math";
import { createTiles, setGround, setWall, type Tiles } from "../tiles";
import { createWorld, type World } from "../world";
import type { LevelDef } from "./definitions";
import type { LootRuntime } from "../loot/runtime";

// A level's tiles, and the center of its spawn tile. Throws on a map that
// breaks the rules, so a bad level fails as soon as it's loaded.
export function levelTiles(level: LevelDef): { tiles: Tiles; spawn: Vec2 } {
  const { map, legend } = level;
  const width = map[0]?.length ?? 0;
  // Each ground in the legend becomes a ground type, numbered in order.
  const grounds = [
    ...new Set(
      Object.values(legend).flatMap((tile) => (tile.wall ? [] : [tile.ground])),
    ),
  ];
  const tiles = createTiles(width, map.length, grounds);
  const spawns: Vec2[] = [];

  map.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`${level.name}: row ${y} isn't ${width} tiles wide`);
    }
    [...row].forEach((char, x) => {
      const tile = legend[char];
      if (!tile) throw new Error(`${level.name}: unknown tile "${char}"`);
      if (tile.wall) {
        setWall(tiles, x, y);
        return;
      }
      setGround(tiles, x, y, grounds.indexOf(tile.ground));
      if (tile.spawn) spawns.push({ x: x + 0.5, y: y + 0.5 });
    });
  });

  if (spawns.length !== 1) {
    throw new Error(`${level.name}: needs one spawn, has ${spawns.length}`);
  }
  return { tiles, spawn: spawns[0] };
}

// A new world for `level`: its map, with its enemies and portals placed. Characters
// aren't spawned; put them at `spawn`.
export function loadLevel(
  level: LevelDef,
  random: () => number = Math.random,
  loot?: LootRuntime,
): { world: World; spawn: Vec2 } {
  const { tiles, spawn } = levelTiles(level);
  const world = createWorld(tiles, random, loot);
  for (const { enemy, at } of level.enemies ?? []) {
    spawnEnemy(world, enemy, at);
  }
  for (const { portal, at } of level.portals ?? []) {
    spawnPortal(world, portal, at);
  }
  return { world, spawn };
}
