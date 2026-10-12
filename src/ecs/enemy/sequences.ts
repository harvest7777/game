import type { SoundId } from "../../audio/assets";
import type { Vec2 } from "../shared/physics/math";
import type { WeaponDef } from "../projectile/weapons";

// A boss move is an authored timeline. Stages are the source of truth for
// both gameplay cues and the clip the renderer shows to the player.
export type BossCue =
  | { kind: "fire"; weapon: WeaponDef; offset?: number }
  | { kind: "sound"; sound: SoundId };

// How a boss moves during a stage: as its phase's behavior says, not at
// all, or dashing along its locked aim at `speedScale` times its speed. Each
// kind's velocity comes from STAGE_MOVERS in stageMovement.ts.
export type BossMovement =
  | { kind: "phase" }
  | { kind: "stationary" }
  | { kind: "dash"; speedScale: number };

// `Clip` names the clips in the boss's art, so a stage can only play one it
// has (see defineEnemy).
export type BossStage<Clip extends string = string> = {
  animation: NoInfer<Clip>;
  duration: number;
  movement: BossMovement;
  // Captured on entering the stage. A player can dodge after the tell.
  lockAim?: boolean;
  // Multiplies incoming damage while this stage is active.
  vulnerable?: number;
  cues?: { at: number; cue: BossCue }[];
};

export type BossSequence<Clip extends string = string> = {
  stages: BossStage<Clip>[];
};

export type BossAction = {
  sequence: string;
  rotationIndex: number;
  stageIndex: number;
  time: number;
  previousTime: number;
  active: boolean;
  heading?: Vec2;
};
