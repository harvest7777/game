import type { WeaponDef } from "../projectile/weapons";
import type { Behavior } from "./behaviors";

// Every way a phase can end, each checking its one number against the
// situation. Adding a condition is adding an entry here.
const CONDITIONS = {
  // Its health is below this fraction of its maximum.
  healthBelow: (fraction: number, s: PhaseSituation) =>
    s.healthFraction < fraction,
  // It has been in the phase this many seconds.
  after: (seconds: number, s: PhaseSituation) => s.time >= seconds,
  // Its target is within this many tiles.
  targetWithin: (tiles: number, s: PhaseSituation) =>
    s.targetDistance !== undefined && s.targetDistance <= tiles,
  // It has no target, or its target is further than this many tiles.
  targetBeyond: (tiles: number, s: PhaseSituation) =>
    s.targetDistance === undefined || s.targetDistance > tiles,
};

type ConditionKind = keyof typeof CONDITIONS;

// When an enemy moves on from a phase: one of CONDITIONS and its number,
// like `{ healthBelow: 0.5 }`.
export type Condition = {
  [K in ConditionKind]: { [P in K]: number };
}[ConditionKind];

// One stage of an enemy's fight. Anything left out falls back to the
// enemy's own `idle`, `aggro` and `weapon`; `weapon: null` holds fire.
// `Sequence` and `Name` are the enemy's own sequence and phase names, so a
// phase can only name ones that exist (see defineEnemy).
export type Phase<
  Sequence extends string = string,
  Name extends string = string,
> = {
  idle?: Behavior;
  aggro?: Behavior;
  weapon?: WeaponDef | null;
  // Completed boss sequences advance through this deterministic loop.
  rotation?: NoInfer<Sequence>[];
  // Checked in order each tick; the first whose condition holds wins.
  next?: { to: NoInfer<Name>; when: Condition }[];
};

export type Phases<
  Sequence extends string = string,
  Name extends string = string,
> = {
  start: NoInfer<Name>;
  list: Record<Name, Phase<Sequence, Name>>;
};

// What a transition can look at.
export type PhaseSituation = {
  // Seconds in the current phase.
  time: number;
  healthFraction: number;
  // Tiles to its target, or undefined with no target.
  targetDistance?: number;
};

export function holds(condition: Condition, s: PhaseSituation): boolean {
  const [kind, value] = Object.entries(condition)[0] as [ConditionKind, number];
  return CONDITIONS[kind](value, s);
}

// The phase to move to, or undefined to stay.
export function nextPhase(
  phase: Phase,
  situation: PhaseSituation,
): string | undefined {
  return phase.next?.find(({ when }) => holds(when, situation))?.to;
}
