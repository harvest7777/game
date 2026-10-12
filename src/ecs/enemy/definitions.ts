import type { Speed } from "../input/components";
import type { Hitbox } from "../movement/components";
import type { WeaponId } from "../projectile/weapons";
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
  },
  slime: {
    sprite: { name: "slime", outline: OUTLINED },
    hitbox: { r: 0.4 },
    health: 150,
    speed: 2,
    weapon: "slimeSpit",
    detectRange: 7,
  },
  archer: {
    sprite: { name: "archer", outline: OUTLINED },
    hitbox: { r: 0.35 },
    health: 100,
    speed: 3,
    weapon: "archerVolley",
    detectRange: 9,
  },
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof enemies;

export const enemyIds = Object.keys(enemies) as EnemyId[];

export function enemyDef(id: EnemyId): EnemyDef {
  return enemies[id];
}
