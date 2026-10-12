import type { Position } from "../movement/components";
import type { BehaviorMemory, Quirks } from "./behaviors";
import type { EnemyId } from "./definitions";

// An enemy: which kind, where it was spawned (which behaviors like
// wandering and returning home are anchored to), and for kinds with phases,
// which phase it's in and for how many seconds. Its quirks vary how it moves
// from others of its kind.
export type Enemy = {
  def: EnemyId;
  origin: Position;
  phase?: { name: string; time: number };
  quirks?: Quirks;
};

// Which of its behaviors an enemy is running and what that behavior
// remembers. Switching behavior starts it with a fresh memory.
export type Brain = { mode: "idle" | "aggro"; memory: BehaviorMemory };
