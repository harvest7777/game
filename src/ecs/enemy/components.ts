import type { Position } from "../movement/components";
import type { BehaviorMemory } from "./behaviors";
import type { EnemyId } from "./definitions";

// An enemy: which kind, and where it was spawned, which behaviors like
// wandering and returning home are anchored to.
export type Enemy = { def: EnemyId; origin: Position };

// Which of its behaviors an enemy is running and what that behavior
// remembers. Switching behavior starts it with a fresh memory.
export type Brain = { mode: "idle" | "aggro"; memory: BehaviorMemory };
