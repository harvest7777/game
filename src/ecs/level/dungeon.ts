import type { DungeonDef, ThemedCell } from "../../dungeon/definition";
import { generateDungeon } from "../../dungeon/generate";
import { kindAt, type CellKind } from "../../dungeon/grid";
import type { EnemyDef } from "../enemy/definitions";
import type { GroundDef, WallDef } from "../tiles";
import type { LevelDef, TileDef } from "./definitions";

// Turns a generated dungeon into a level: the one place dungeon ids meet
// game definitions. The generator knows nothing about grounds or enemies,
// and the level loader knows nothing about dungeons.

// Everything a dungeon's ids can name, by id.
export type DungeonRegistries = {
  enemies: Readonly<Record<string, EnemyDef>>;
  grounds: Readonly<Record<string, GroundDef>>;
  walls: Readonly<Record<string, WallDef>>;
};

// The map character each kind of cell is drawn with. Rock nothing reaches
// is void: black, and as solid as a wall.
const CHARS: Record<CellKind, string> = {
  void: " ",
  wall: "#",
  floor: ".",
  corridor: ",",
  liquid: "~",
  accent: "*",
};
const SPAWN = "P";

// The level `def` builds from `seed`. Throws on an id the registries don't
// have.
export function dungeonLevel(
  def: DungeonDef,
  seed: number,
  registries: DungeonRegistries,
): LevelDef {
  const dungeon = generateDungeon(def, seed);
  const { map, start } = dungeon;
  const ground = (cell: ThemedCell): GroundDef =>
    lookup(registries.grounds, def.theme[cell] ?? def.theme.floor, "ground");

  const legend: Record<string, TileDef> = {
    [CHARS.void]: { void: true },
    [CHARS.wall]: def.theme.wall
      ? { wall: true, style: lookup(registries.walls, def.theme.wall, "wall") }
      : { wall: true },
    [CHARS.floor]: { ground: ground("floor") },
    [CHARS.corridor]: { ground: ground("corridor") },
    [CHARS.liquid]: { ground: ground("liquid") },
    [CHARS.accent]: { ground: ground("accent") },
    [SPAWN]: {
      ground: ground(themedAt(kindAt(map, start.x, start.y))),
      spawn: true,
    },
  };

  const rows = Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) =>
      x === start.x && y === start.y ? SPAWN : CHARS[kindAt(map, x, y)],
    ).join(""),
  );

  return {
    name: `${def.name} (seed ${seed})`,
    legend,
    map: rows,
    enemies: dungeon.spawns.map(({ enemy, at }) => ({
      enemy: lookup(registries.enemies, enemy, "enemy"),
      at: { x: at.x + 0.5, y: at.y + 0.5 },
    })),
  };
}

// The themed kind a walkable cell is drawn as.
function themedAt(kind: CellKind): ThemedCell {
  return kind === "corridor" || kind === "liquid" || kind === "accent"
    ? kind
    : "floor";
}

function lookup<T>(
  registry: Readonly<Record<string, T>>,
  id: string,
  what: string,
): T {
  const found = registry[id];
  if (!found) throw new Error(`dungeon names unknown ${what} "${id}"`);
  return found;
}
