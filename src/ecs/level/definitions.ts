import type { EnemyDef } from "../enemy/definitions";
import type { Vec2 } from "../shared/physics/math";
import type { GroundDef } from "../tiles";
import type { PortalDef } from "../portal/definitions";

// What one map character stands for: a wall, or a ground to walk on, which
// can be where characters spawn.
export type TileDef =
  { wall: true } | { wall?: false; ground: GroundDef; spawn?: boolean };

// A place to play: its map, drawn as text, and anything that starts in it.
// Each level is its own file under src/content/levels.
export type LevelDef = {
  name: string;
  // What each character in the map means.
  legend: Record<string, TileDef>;
  // Rows from top to bottom, one character per tile. Every row is the same
  // length, and exactly one tile is a spawn.
  map: string[];
  // Placed when the level loads, in tiles from the map's top-left corner.
  enemies?: { enemy: EnemyDef; at: Vec2 }[];
  // Portals placed when the level loads, in tiles like enemies.
  portals?: { portal: PortalDef; at: Vec2 }[];
};
