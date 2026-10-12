import type { Speed } from "../input/components";
import type { Hitbox } from "../movement/components";
import type { WeaponId } from "../projectile/weapons";
import type { Behavior } from "./behaviors";
import type { Phase, Phases } from "./phases";
import type { Outline, Sprite } from "../sprite/components";

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
  },
  // A boss in four phases. It circles and sprays fans, then below two
  // thirds health chases and fires rings, then below 30% charges throwing
  // shard rings, stopping to catch its breath every 6 seconds.
  slimeKing: {
    sprite: {
      name: "slime",
      scale: 1.8,
      outline: { color: [1, 0.85, 0.2, 1], glow: { radius: 1, pulseHz: 1 } },
    },
    hitbox: { r: 0.7 },
    health: 1500,
    speed: 2.5,
    weapon: "kingSpray",
    detectRange: 11,
    idle: { kind: "wander", radius: 2 },
    aggro: { kind: "orbit", radius: 6 },
    phases: {
      start: "awake",
      list: {
        awake: { next: [{ to: "enraged", when: { healthBelow: 0.66 } }] },
        enraged: {
          aggro: { kind: "chase", stopAt: 3 },
          weapon: "kingRing",
          next: [{ to: "desperate", when: { healthBelow: 0.3 } }],
        },
        desperate: {
          aggro: {
            kind: "charge",
            windup: 0.4,
            duration: 0.6,
            speedScale: 3,
            rest: 0.8,
          },
          weapon: "kingFrenzy",
          next: [{ to: "resting", when: { after: 6 } }],
        },
        resting: {
          idle: { kind: "stationary" },
          aggro: { kind: "stationary" },
          weapon: null,
          next: [{ to: "desperate", when: { after: 2.5 } }],
        },
      },
    },
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
