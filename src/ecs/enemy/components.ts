import type { Position } from "../movement/components";
import type { EnemyId } from "./definitions";

// An enemy: which kind, and where it was spawned, which behaviors like
// wandering and returning home are anchored to.
export type Enemy = { def: EnemyId; origin: Position };
