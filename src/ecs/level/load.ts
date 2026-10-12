import { spawnEnemy } from "../enemy/spawn";
import type { Vec2 } from "../shared/physics/math";
import { createTiles, setWall, type Tiles } from "../tiles";
import { createWorld, type World } from "../world";
import type { LevelDef } from "./definitions";

// What each map character means. Adding a kind of tile is adding an entry.
export const TILE_LEGEND = {
  "#": { wall: true },
  ".": { wall: false },
  // Floor where characters spawn.
  P: { wall: false, spawn: true },
} satisfies Record<string, { wall: boolean; spawn?: boolean }>;

// A level's tiles, and the center of its spawn tile. Throws on a map that
// breaks the rules, so a bad level fails as soon as it's loaded.
export function levelTiles(level: LevelDef): { tiles: Tiles; spawn: Vec2 } {
  const { map } = level;
  const width = map[0]?.length ?? 0;
  const tiles = createTiles(width, map.length);
  const spawns: Vec2[] = [];

  map.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`${level.name}: row ${y} isn't ${width} tiles wide`);
    }
    [...row].forEach((char, x) => {
      const tile: { wall: boolean; spawn?: boolean } | undefined =
        TILE_LEGEND[char as keyof typeof TILE_LEGEND];
      if (!tile) throw new Error(`${level.name}: unknown tile "${char}"`);
      setWall(tiles, x, y, tile.wall);
      if (tile.spawn) spawns.push({ x: x + 0.5, y: y + 0.5 });
    });
  });

  if (spawns.length !== 1) {
    throw new Error(`${level.name}: needs one spawn, has ${spawns.length}`);
  }
  return { tiles, spawn: spawns[0] };
}

// A new world for `level`: its map, with its enemies placed. Characters
// aren't spawned; put them at `spawn`.
export function loadLevel(
  level: LevelDef,
  random: () => number = Math.random,
): { world: World; spawn: Vec2 } {
  const { tiles, spawn } = levelTiles(level);
  const world = createWorld(tiles, random);
  for (const { enemy, at } of level.enemies ?? []) {
    spawnEnemy(world, enemy, at);
  }
  return { world, spawn };
}
