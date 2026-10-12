import type { MoveSpeed } from "../input/components";
import type { Hitbox } from "../movement/components";
import type { WeaponDef } from "../projectile/weapons";
import type { Behavior } from "./behaviors";
import type { Phase, Phases } from "./phases";
import type { BossSequence } from "./sequences";
import type { SpriteArt } from "../sprite/art";
import type { Sprite } from "../sprite/components";
import type { SoundId } from "../../audio/assets";
import type { LootTableDef } from "../loot/definitions";
import type { PortalDef } from "../portal/definitions";
import type { LivingStatBlock } from "../stats/components";

// What a kind of enemy is. Each kind is its own file under
// src/content/enemies, made with defineEnemy. Fields reuse the component
// types they end up in.
//
// A boss's names are checked: `Clip` is what its art's clips are called,
// `Sequence` what its sequences are called and `PhaseName` what its phases
// are called, so naming one that doesn't exist won't compile.
export type EnemyDef<
  Clip extends string = string,
  Sequence extends string = string,
  PhaseName extends string = string,
> = {
  sprite: Pick<Sprite, "outline" | "scale"> & { art: SpriteArt<Clip> };
  hitbox: Hitbox;
  // Health is required; other stats are opt-in per enemy kind.
  stats: LivingStatBlock;
  // Tiles per second when its behavior moves it.
  speed: MoveSpeed;
  // Fired at its target while it has one.
  weapon?: WeaponDef;
  // Tiles: it targets the nearest thing on the other team within this
  // range, and loses interest once they leave it.
  detectRange: number;
  // How it moves with no target, and with one.
  idle: Behavior;
  aggro: Behavior;
  // Stages of its fight, each able to swap its behaviors and weapon.
  phases?: Phases<Sequence, PhaseName>;
  // Authored timelines used by phases with a sequence rotation.
  sequences?: Record<Sequence, BossSequence<Clip>>;
  // Rolled once when this enemy dies.
  loot?: LootTableDef;
  deathSound: SoundId;
  // Opened where it dies, like a dungeon boss's way home.
  deathPortal?: PortalDef;
};

// Checks an enemy's names against each other (see EnemyDef) and returns it
// as a plain EnemyDef.
export function defineEnemy<
  Clip extends string,
  Sequence extends string,
  PhaseName extends string,
>(def: EnemyDef<Clip, Sequence, PhaseName>): EnemyDef {
  return def;
}

// The phase an enemy is in, if its kind has phases.
export function phaseOf(def: EnemyDef, name?: string): Phase | undefined {
  if (!def.phases || name === undefined) return undefined;
  return def.phases.list[name];
}
