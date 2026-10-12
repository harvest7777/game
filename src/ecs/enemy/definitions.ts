import type { Speed } from "../input/components";
import type { Hitbox } from "../movement/components";
import type { WeaponId } from "../projectile/weapons";
import type { Behavior } from "./behaviors";
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
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof enemies;

export const enemyIds = Object.keys(enemies) as EnemyId[];

export function enemyDef(id: EnemyId): EnemyDef {
  return enemies[id];
}
