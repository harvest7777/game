import type { SoundId } from "../../audio/assets";
import type { Vec2 } from "../shared/physics/math";
import type { WeaponId } from "../projectile/weapons";

// A boss move is an authored timeline. Stages are the source of truth for
// both gameplay cues and the clip the renderer shows to the player.
export type BossCue =
  | { kind: "fire"; weapon: WeaponId; offset?: number }
  | { kind: "sound"; sound: SoundId };

export type BossMovement =
  "phase" | "stationary" | { kind: "dash"; speedScale: number };

export type BossStage = {
  animation: string;
  duration: number;
  movement: BossMovement;
  // Captured on entering the stage. A player can dodge after the tell.
  lockAim?: boolean;
  // Multiplies incoming damage while this stage is active.
  vulnerable?: number;
  cues?: { at: number; cue: BossCue }[];
};

export type BossSequence = { stages: BossStage[] };

export type BossAction = {
  sequence: string;
  rotationIndex: number;
  stageIndex: number;
  time: number;
  previousTime: number;
  active: boolean;
  heading?: Vec2;
};
