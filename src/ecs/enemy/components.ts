import type { Position } from "../movement/components";
import type { Entity } from "../world";
import type { BehaviorMemory, Quirks } from "./behaviors";
import type { EnemyDef } from "./definitions";
import type { BossAction } from "./sequences";

// An enemy: which kind, where it was spawned (which behaviors like
// wandering and returning home are anchored to), and for kinds with phases,
// which phase it's in and for how many seconds. Its quirks vary how it moves
// from others of its kind.
export type Enemy = {
  def: EnemyDef;
  origin: Position;
  // The boss that summoned it, if one did.
  summoner?: Entity;
  phase?: { name: string; time: number };
  quirks?: Quirks;
};

// Marks what the player is here to beat, for the HUD to point at.
export type Quest = true;

// Which of its behaviors an enemy is running and what that behavior
// remembers. Switching behavior starts it with a fresh memory.
export type Brain = { mode: "idle" | "aggro"; memory: BehaviorMemory };

// Runtime state for an authored boss sequence. Regular enemies do not get it.
export type { BossAction };
