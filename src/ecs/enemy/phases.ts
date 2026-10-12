import type { WeaponId } from "../projectile/weapons";
import type { Behavior } from "./behaviors";

// When an enemy moves on from a phase.
export type Condition =
  // Its health is below this fraction of its maximum.
  | { healthBelow: number }
  // It has been in the phase this many seconds.
  | { after: number }
  // Its target is within this many tiles.
  | { targetWithin: number }
  // It has no target, or its target is further than this many tiles.
  | { targetBeyond: number };

// One stage of an enemy's fight. Anything left out falls back to the
// enemy's own `idle`, `aggro` and `weapon`; `weapon: null` holds fire.
export type Phase = {
  idle?: Behavior;
  aggro?: Behavior;
  weapon?: WeaponId | null;
  // Completed boss sequences advance through this deterministic loop.
  rotation?: string[];
  // Checked in order each tick; the first whose condition holds wins.
  next?: { to: string; when: Condition }[];
};

export type Phases = { start: string; list: Record<string, Phase> };

// What a transition can look at.
export type PhaseSituation = {
  // Seconds in the current phase.
  time: number;
  healthFraction: number;
  // Tiles to its target, or undefined with no target.
  targetDistance?: number;
};

export function holds(condition: Condition, s: PhaseSituation): boolean {
  if ("healthBelow" in condition) {
    return s.healthFraction < condition.healthBelow;
  }
  if ("after" in condition) return s.time >= condition.after;
  if ("targetWithin" in condition) {
    return (
      s.targetDistance !== undefined &&
      s.targetDistance <= condition.targetWithin
    );
  }
  return (
    s.targetDistance === undefined || s.targetDistance > condition.targetBeyond
  );
}

// The phase to move to, or undefined to stay.
export function nextPhase(
  phase: Phase,
  situation: PhaseSituation,
): string | undefined {
  return phase.next?.find(({ when }) => holds(when, situation))?.to;
}
