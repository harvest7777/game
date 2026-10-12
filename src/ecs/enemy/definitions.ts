import type { Speed } from "../input/components";
import type { Hitbox } from "../movement/components";
import type { WeaponId } from "../projectile/weapons";
import type { Behavior } from "./behaviors";
import type { Phase, Phases } from "./phases";
import type { BossSequence } from "./sequences";
import type { Outline, Sprite } from "../sprite/components";
import type { SoundId } from "../../audio/assets";

// What a kind of enemy is. Like projectiles and weapons, it's data: add an
// entry to add a kind. Fields reuse the component types they end up in.
export type EnemyDef = {
  sprite: Pick<Sprite, "name" | "outline" | "scale">;
  hitbox: Hitbox;
  // Starting and maximum health.
  health: number;
  // Tiles per second when its behavior moves it.
  speed: Speed;
  // Fired at its target while it has one.
  weapon?: WeaponId;
  // Tiles: it targets the nearest thing on the other team within this
  // range, and loses interest once they leave it.
  detectRange: number;
  // How it moves with no target, and with one.
  idle: Behavior;
  aggro: Behavior;
  // Stages of its fight, each able to swap its behaviors and weapon.
  phases?: Phases;
  // Authored timelines used by phases with a sequence rotation.
  sequences?: Record<string, BossSequence>;
  deathSound: SoundId;
  // Ordinary crowds stay quiet when firing; bosses opt in.
  playsShotSound?: boolean;
};

const OUTLINED: Outline = { color: [0, 0, 0, 1] };

export const enemies = {
  // Stands still and takes hits.
  dummy: {
    sprite: { name: "dummy", outline: OUTLINED },
    hitbox: { r: 0.4 },
    health: 300,
    speed: 0,
    detectRange: 0,
    idle: { kind: "stationary" },
    aggro: { kind: "stationary" },
    deathSound: "enemyDeath",
  },
  slime: {
    sprite: { name: "slime", outline: OUTLINED },
    hitbox: { r: 0.4 },
    health: 150,
    speed: 2,
    weapon: "slimeSpit",
    detectRange: 7,
    idle: { kind: "wander", radius: 2.5 },
    aggro: { kind: "chase", stopAt: 2.5 },
    deathSound: "enemyDeath",
  },
  archer: {
    sprite: { name: "archer", outline: OUTLINED },
    hitbox: { r: 0.35 },
    health: 100,
    speed: 3,
    weapon: "archerVolley",
    detectRange: 9,
    idle: { kind: "wander", radius: 3 },
    // Keeps its distance, circling while it shoots.
    aggro: { kind: "orbit", radius: 5 },
    deathSound: "enemyDeath",
  },
  // Paces around, then charges at you in bursts, spitting as it goes.
  boar: {
    sprite: { name: "boar", outline: OUTLINED },
    hitbox: { r: 0.4 },
    health: 220,
    speed: 3,
    weapon: "slimeSpit",
    detectRange: 8,
    idle: { kind: "wander", radius: 2 },
    aggro: {
      kind: "charge",
      windup: 0.6,
      duration: 0.5,
      speedScale: 3.5,
      rest: 1.2,
    },
    deathSound: "enemyDeath",
  },
  // A health-gated, deterministic encounter. Every attack's timeline owns
  // its telegraph, release, movement and any weak-point window.
  slimeKing: {
    sprite: {
      name: "slimeKing",
      scale: 1.8,
      outline: { color: [1, 0.85, 0.2, 1], glow: { radius: 1, pulseHz: 1 } },
    },
    hitbox: { r: 0.7 },
    health: 1500,
    speed: 2.5,
    detectRange: 11,
    idle: { kind: "wander", radius: 2 },
    aggro: { kind: "orbit", radius: 6 },
    phases: {
      start: "awake",
      list: {
        awake: {
          rotation: ["crownRing", "aimedSpray", "crownRing"],
          next: [{ to: "enraged", when: { healthBelow: 0.66 } }],
        },
        enraged: {
          aggro: { kind: "chase", stopAt: 3 },
          rotation: ["charge", "ringCast", "charge", "aimedSpray"],
          next: [{ to: "desperate", when: { healthBelow: 0.3 } }],
        },
        desperate: {
          rotation: ["frenzy", "charge", "collapse"],
        },
      },
    },
    sequences: {
      crownRing: {
        stages: [
          {
            animation: "ringTell",
            duration: 0.55,
            movement: "stationary",
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
          },
          {
            animation: "ringCast",
            duration: 0.25,
            movement: "stationary",
            cues: [
              { at: 0.08, cue: { kind: "fire", weapon: "kingRing" } },
              { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
            ],
          },
          { animation: "recover", duration: 0.45, movement: "phase" },
        ],
      },
      aimedSpray: {
        stages: [
          {
            animation: "aimTell",
            duration: 0.5,
            movement: "stationary",
            lockAim: true,
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
          },
          {
            animation: "sprayCast",
            duration: 0.25,
            movement: "stationary",
            cues: [
              { at: 0.08, cue: { kind: "fire", weapon: "kingSpray" } },
              { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
            ],
          },
          { animation: "recover", duration: 0.45, movement: "phase" },
        ],
      },
      charge: {
        stages: [
          {
            animation: "chargeTell",
            duration: 0.55,
            movement: "stationary",
            lockAim: true,
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
          },
          {
            animation: "chargeDash",
            duration: 0.6,
            movement: { kind: "dash", speedScale: 4 },
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossDash" } }],
          },
          {
            animation: "exposed",
            duration: 0.8,
            movement: "stationary",
            vulnerable: 1.5,
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossExpose" } }],
          },
        ],
      },
      ringCast: {
        stages: [
          {
            animation: "ringTell",
            duration: 0.4,
            movement: "stationary",
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
          },
          {
            animation: "ringCast",
            duration: 0.25,
            movement: "stationary",
            cues: [
              { at: 0.06, cue: { kind: "fire", weapon: "kingRing" } },
              { at: 0.06, cue: { kind: "sound", sound: "bossCast" } },
            ],
          },
          { animation: "recover", duration: 0.35, movement: "phase" },
        ],
      },
      frenzy: {
        stages: [
          {
            animation: "frenzyTell",
            duration: 0.45,
            movement: "stationary",
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
          },
          {
            animation: "frenzyCast",
            duration: 0.35,
            movement: "stationary",
            cues: [
              { at: 0.08, cue: { kind: "fire", weapon: "kingFrenzy" } },
              { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
            ],
          },
          {
            animation: "frenzyCast",
            duration: 0.35,
            movement: "stationary",
            cues: [
              { at: 0.08, cue: { kind: "fire", weapon: "kingFrenzy" } },
              { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
            ],
          },
          { animation: "recover", duration: 0.4, movement: "phase" },
        ],
      },
      collapse: {
        stages: [
          {
            animation: "collapse",
            duration: 0.5,
            movement: "stationary",
            cues: [{ at: 0, cue: { kind: "sound", sound: "bossExpose" } }],
          },
          {
            animation: "exposed",
            duration: 1.25,
            movement: "stationary",
            vulnerable: 2,
          },
          { animation: "recover", duration: 0.45, movement: "phase" },
        ],
      },
    },
    deathSound: "bossDeath",
    playsShotSound: true,
  },
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof enemies;

export const enemyIds = Object.keys(enemies) as EnemyId[];

export function enemyDef(id: EnemyId): EnemyDef {
  return enemies[id];
}

// The phase an enemy is in, if its kind has phases.
export function phaseOf(def: EnemyDef, name?: string): Phase | undefined {
  if (!def.phases || name === undefined) return undefined;
  return def.phases.list[name];
}
