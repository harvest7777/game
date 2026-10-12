import type { FeatureKind } from "./features";
import type { LoopKind } from "./graph";
import type { DungeonSpec } from "./generate";
import { CELL_KINDS, isWalkable, type CellKind } from "./grid";
import type { PlacementKind } from "./place";
import type { SpawnPlacementKind } from "./populate";
import type { RouterKind } from "./route";
import type { ShapeKind } from "./shapes";

// A dungeon as content: plain JSON an asset maker can write, naming
// enemies and grounds by id. `parseDungeonDef` checks one and says exactly
// what's wrong with it, so a bad file fails as it loads rather than when a
// seed happens to use the broken part.

// The cell kinds a theme can paint. Walls are always walls.
export const THEMED_CELLS = ["floor", "corridor", "liquid", "accent"] as const;
export type ThemedCell = (typeof THEMED_CELLS)[number];

export type DungeonDef = DungeonSpec & {
  name: string;
  // The ground id each kind of cell is drawn as. Liquid and accent cells
  // are plain floor unless the theme says otherwise. `wall` is a wall id;
  // without one, walls are the default wall.
  theme: {
    floor: string;
    corridor: string;
    liquid?: string;
    accent?: string;
    wall?: string;
  };
};

// Ids the dungeon may name, when they're known.
export type KnownIds = {
  enemies?: readonly string[];
  grounds?: readonly string[];
  walls?: readonly string[];
};

export type ParseResult =
  { ok: true; def: DungeonDef } | { ok: false; errors: string[] };

export function parseDungeonDef(
  value: unknown,
  known: KnownIds = {},
): ParseResult {
  const errors: string[] = [];
  checkDungeon(new Checker(errors, known), value);
  return errors.length
    ? { ok: false, errors }
    : { ok: true, def: value as DungeonDef };
}

// The definition, or an error listing everything wrong with it.
export function dungeonDef(value: unknown, known: KnownIds = {}): DungeonDef {
  const result = parseDungeonDef(value, known);
  if (result.ok) return result.def;
  throw new Error(`invalid dungeon:\n  ${result.errors.join("\n  ")}`);
}

type Fields = Record<string, unknown>;

// Collects errors, each prefixed with where in the definition it is, like
// `rooms.normal[1].shape.w`.
class Checker {
  readonly errors: string[];
  readonly known: KnownIds;
  // Paths of required fields that weren't there.
  readonly missing = new Set<string>();

  constructor(errors: string[], known: KnownIds) {
    this.errors = errors;
    this.known = known;
  }

  // A missing field was already reported by the object it's missing from,
  // so it's never reported again as the wrong type.
  fail(path: string, message: string): void {
    if (this.missing.has(path)) return;
    this.errors.push(`${path}: ${message}`);
  }

  // An object with every `required` key, and no keys but those and
  // `optional`. Null if it isn't an object at all.
  object(
    path: string,
    value: unknown,
    required: readonly string[],
    optional: readonly string[] = [],
  ): Fields | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      this.fail(path, "should be an object");
      return null;
    }
    const fields = value as Fields;
    for (const k of required) {
      if (k in fields) continue;
      this.fail(path, `is missing "${k}"`);
      this.missing.add(path === "dungeon" ? k : `${path}.${k}`);
    }
    for (const k of Object.keys(fields)) {
      if (!required.includes(k) && !optional.includes(k)) {
        this.fail(path, `has unknown field "${k}"`);
      }
    }
    return fields;
  }

  array(path: string, value: unknown, { nonEmpty = true } = {}): unknown[] {
    if (!Array.isArray(value)) {
      this.fail(path, "should be a list");
      return [];
    }
    if (nonEmpty && !value.length) this.fail(path, "should not be empty");
    return value;
  }

  string(path: string, value: unknown): value is string {
    if (typeof value === "string" && value.length) return true;
    this.fail(path, "should be a non-empty string");
    return false;
  }

  number(
    path: string,
    value: unknown,
    { min = -Infinity, max = Infinity, whole = false } = {},
  ): void {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.fail(path, "should be a number");
    } else if (whole && !Number.isInteger(value)) {
      this.fail(path, "should be a whole number");
    } else if (value < min) {
      this.fail(path, `should be at least ${min}`);
    } else if (value > max) {
      this.fail(path, `should be at most ${max}`);
    }
  }

  // [min, max], each within the given bounds.
  range(
    path: string,
    value: unknown,
    bounds: { min?: number; max?: number; whole?: boolean } = {},
  ): void {
    if (!Array.isArray(value) || value.length !== 2) {
      this.fail(path, "should be a [min, max] pair");
      return;
    }
    this.number(`${path}[0]`, value[0], bounds);
    this.number(`${path}[1]`, value[1], bounds);
    if (value[0] > value[1]) this.fail(path, "min is more than max");
  }

  oneOf<T extends string>(
    path: string,
    value: unknown,
    options: readonly T[],
  ): value is T {
    if (options.includes(value as T)) return true;
    this.fail(path, `should be one of ${options.join(", ")}`);
    return false;
  }

  id(path: string, value: unknown, known: readonly string[] | undefined) {
    if (!this.string(path, value)) return;
    if (known && !known.includes(value))
      this.fail(path, `unknown id "${value}"`);
  }

  // An object picked by its `kind`, checked by that kind's entry in
  // `kinds`, which lists its other fields.
  kind<K extends string>(
    path: string,
    value: unknown,
    kinds: Record<K, KindCheck>,
  ): void {
    const head = value as Fields | null;
    if (typeof head !== "object" || head === null) {
      this.fail(path, "should be an object");
      return;
    }
    if (!this.oneOf(`${path}.kind`, head.kind, Object.keys(kinds) as K[])) {
      return;
    }
    const check = kinds[head.kind as K];
    const fields = this.object(
      path,
      value,
      ["kind", ...(check.required ?? [])],
      check.optional,
    );
    if (fields) check.check(this, path, fields);
  }
}

type KindCheck = {
  required?: string[];
  optional?: string[];
  check: (c: Checker, path: string, fields: Fields) => void;
};

const size = { min: 1, whole: true };

// Each table has an entry for every kind its stage has, so adding a kind
// without saying how to check it doesn't compile.
const SHAPE_CHECKS: Record<ShapeKind, KindCheck> = {
  rect: {
    required: ["w", "h"],
    check: (c, path, f) => {
      c.range(`${path}.w`, f.w, size);
      c.range(`${path}.h`, f.h, size);
    },
  },
  ellipse: {
    required: ["w", "h"],
    check: (c, path, f) => {
      c.range(`${path}.w`, f.w, size);
      c.range(`${path}.h`, f.h, size);
    },
  },
  cave: {
    required: ["w", "h"],
    optional: ["fill", "smoothing"],
    check: (c, path, f) => {
      // Smaller boxes than this hardly ever grow a usable cave.
      c.range(`${path}.w`, f.w, { min: 6, whole: true });
      c.range(`${path}.h`, f.h, { min: 6, whole: true });
      if ("fill" in f) c.number(`${path}.fill`, f.fill, { min: 0, max: 1 });
      if ("smoothing" in f) {
        c.number(`${path}.smoothing`, f.smoothing, { min: 0, whole: true });
      }
    },
  },
};

const PAINTABLE = CELL_KINDS.filter(isWalkable);

const FEATURE_CHECKS: Record<FeatureKind, KindCheck> = {
  pool: {
    required: ["coverage"],
    optional: ["cell"],
    check: (c, path, f) => {
      c.range(`${path}.coverage`, f.coverage, { min: 0, max: 1 });
      if ("cell" in f) c.oneOf<CellKind>(`${path}.cell`, f.cell, PAINTABLE);
    },
  },
  pillars: {
    required: ["spacing"],
    check: (c, path, f) =>
      c.number(`${path}.spacing`, f.spacing, { min: 2, whole: true }),
  },
  border: {
    required: ["width"],
    optional: ["cell"],
    check: (c, path, f) => {
      c.number(`${path}.width`, f.width, size);
      if ("cell" in f) c.oneOf<CellKind>(`${path}.cell`, f.cell, PAINTABLE);
    },
  },
};

const LOOP_CHECKS: Record<LoopKind, KindCheck> = {
  shortcut: {
    required: ["count", "span"],
    check: (c, path, f) => {
      c.range(`${path}.count`, f.count, { min: 0, whole: true });
      c.range(`${path}.span`, f.span, { min: 2, whole: true });
    },
  },
  detour: {
    required: ["count", "span", "length"],
    check: (c, path, f) => {
      c.range(`${path}.count`, f.count, { min: 0, whole: true });
      c.range(`${path}.span`, f.span, { min: 2, whole: true });
      c.range(`${path}.length`, f.length, size);
    },
  },
};

const PLACEMENT_CHECKS: Record<PlacementKind, KindCheck> = {
  grow: {
    required: ["gap"],
    optional: ["margin"],
    check: (c, path, f) => {
      c.range(`${path}.gap`, f.gap, size);
      if ("margin" in f) c.number(`${path}.margin`, f.margin, size);
    },
  },
};

const ROUTER_CHECKS: Record<RouterKind, KindCheck> = {
  straight: { check: () => {} },
  L: { check: () => {} },
  astar: {
    optional: ["wiggle", "turnCost"],
    check: (c, path, f) => {
      if ("wiggle" in f) c.number(`${path}.wiggle`, f.wiggle, { min: 0 });
      if ("turnCost" in f) {
        c.number(`${path}.turnCost`, f.turnCost, { min: 0 });
      }
    },
  },
};

const SPAWN_PLACEMENT_CHECKS: Record<SpawnPlacementKind, KindCheck> = {
  scatter: {
    optional: ["spacing"],
    check: (c, path, f) => {
      if ("spacing" in f) c.number(`${path}.spacing`, f.spacing, { min: 0 });
    },
  },
  center: { check: () => {} },
  ring: {
    required: ["radius"],
    check: (c, path, f) => c.number(`${path}.radius`, f.radius, { min: 0 }),
  },
  cluster: {
    required: ["radius"],
    check: (c, path, f) => c.number(`${path}.radius`, f.radius, { min: 0 }),
  },
};

function checkDungeon(c: Checker, value: unknown): void {
  const f = c.object("dungeon", value, [
    "name",
    "theme",
    "graph",
    "placement",
    "corridors",
    "rooms",
  ]);
  if (!f) return;
  c.string("name", f.name);

  const theme = c.object(
    "theme",
    f.theme,
    ["floor", "corridor"],
    ["liquid", "accent", "wall"],
  );
  if (theme) {
    for (const [cell, id] of Object.entries(theme)) {
      const known = cell === "wall" ? c.known.walls : c.known.grounds;
      c.id(`theme.${cell}`, id, known);
    }
  }

  const graph = c.object(
    "graph",
    f.graph,
    ["mainPath", "branches", "branchLength"],
    ["loops"],
  );
  if (graph) {
    c.range("graph.mainPath", graph.mainPath, { min: 2, whole: true });
    c.range("graph.branches", graph.branches, { min: 0, whole: true });
    c.range("graph.branchLength", graph.branchLength, size);
    if ("loops" in graph) {
      c.array("graph.loops", graph.loops, { nonEmpty: false }).forEach(
        (loop, i) => c.kind(`graph.loops[${i}]`, loop, LOOP_CHECKS),
      );
    }
  }

  c.kind("placement", f.placement, PLACEMENT_CHECKS);

  const corridors = c.object("corridors", f.corridors, ["routers", "width"]);
  if (corridors) {
    c.array("corridors.routers", corridors.routers).forEach((router, i) =>
      c.kind(`corridors.routers[${i}]`, router, ROUTER_CHECKS),
    );
    c.number("corridors.width", corridors.width, size);
  }

  const rooms = c.object(
    "rooms",
    f.rooms,
    ["start", "normal", "goal"],
    ["deadEnd"],
  );
  if (rooms) {
    for (const [tag, list] of Object.entries(rooms)) {
      c.array(`rooms.${tag}`, list).forEach((room, i) =>
        checkRoom(c, `rooms.${tag}[${i}]`, room),
      );
    }
  }
}

function checkRoom(c: Checker, path: string, value: unknown): void {
  const f = c.object(path, value, ["weight", "shape"], ["features", "spawns"]);
  if (!f) return;
  c.number(`${path}.weight`, f.weight, { min: Number.MIN_VALUE });
  c.kind(`${path}.shape`, f.shape, SHAPE_CHECKS);
  if ("features" in f) {
    c.array(`${path}.features`, f.features, { nonEmpty: false }).forEach(
      (feature, i) => c.kind(`${path}.features[${i}]`, feature, FEATURE_CHECKS),
    );
  }
  if ("spawns" in f) {
    c.array(`${path}.spawns`, f.spawns, { nonEmpty: false }).forEach(
      (group, i) => checkSpawnGroup(c, `${path}.spawns[${i}]`, group),
    );
  }
}

function checkSpawnGroup(c: Checker, path: string, value: unknown): void {
  const f = c.object(path, value, ["rolls", "pick", "placement"]);
  if (!f) return;
  c.range(`${path}.rolls`, f.rolls, { min: 0, whole: true });
  c.array(`${path}.pick`, f.pick).forEach((pick, i) => {
    const p = c.object(
      `${path}.pick[${i}]`,
      pick,
      ["enemy", "weight"],
      ["count"],
    );
    if (!p) return;
    c.id(`${path}.pick[${i}].enemy`, p.enemy, c.known.enemies);
    c.number(`${path}.pick[${i}].weight`, p.weight, { min: Number.MIN_VALUE });
    if ("count" in p) c.range(`${path}.pick[${i}].count`, p.count, size);
  });
  c.kind(`${path}.placement`, f.placement, SPAWN_PLACEMENT_CHECKS);
}
