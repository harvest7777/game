import type { EnemyDef } from "../enemy/definitions";
import type { Vec2 } from "../shared/physics/math";

// A place to play: its map, drawn as text, and anything that starts in it.
// Each level is its own file under src/content/levels.
export type LevelDef = {
  name: string;
  // Rows from top to bottom, one character per tile (see TILE_LEGEND).
  // Every row is the same length, and exactly one tile is `P`.
  map: string[];
  // Placed when the level loads, in tiles from the map's top-left corner.
  enemies?: { enemy: EnemyDef; at: Vec2 }[];
};
