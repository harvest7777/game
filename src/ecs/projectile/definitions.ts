import type { Speed } from "../input/components";
import type { Hitbox, WallResponse } from "../movement/components";
import type { Sprite } from "../sprite/components";
import type { SoundId } from "../../audio/assets";

// What a kind of projectile is. Shared by every shot of that kind; each
// projectile entity only keeps where and which way it was fired and how old
// it is (see Projectile). Add a new kind by adding an entry below.
//
// The path is a pure function of age, built from these parts:
// - It travels along a track at `speed`, changing by `acceleration` and held
//   between `minSpeed` and `maxSpeed`.
// - `turnRate` curves the track. It's radians per second at the starting
//   speed; the curve's shape stays the same if the speed changes.
// - `wave` weaves side to side across the track.
// - `boomerang` retraces the path back to where it was fired, arriving at
//   the end of its lifetime.
export type ProjectileDef = {
  speed: Speed;
  // Damage per hit, rolled as a whole number from min to max inclusive.
  damage: [min: number, max: number];
  // Seconds before it disappears.
  lifetime: number;
  hitbox: Hitbox;
  // Rotated art points right. Drawn at DEFAULT_PROJECTILE_SCALE unless it
  // sets its own scale.
  sprite: Pick<Sprite, "name" | "outline" | "scale">;
  sound: {
    fire: SoundId;
    hitPlayer: SoundId;
    hitEnemy: SoundId;
  };
  // What hitting a wall does; "pass" flies through. Defaults to "stop".
  walls?: WallResponse | "pass";
  // Tiles/s², negative to slow down.
  acceleration?: number;
  minSpeed?: Speed;
  maxSpeed?: Speed;
  // Side-to-side weave: `amplitude` tiles either side of the track,
  // `frequency` full waves per second, `phase` in radians where it starts.
  wave?: { amplitude: number; frequency: number; phase?: number };
  // Radians per second; positive curves clockwise on screen.
  turnRate?: number;
  boomerang?: boolean;
  // Passes through what it hits instead of stopping, hitting each thing
  // once.
  pierces?: boolean;
  // Ignores defense (once there's a stat system).
  armorPiercing?: boolean;
  // Point the sprite along its path.
  faceDirection?: boolean;
  // Radians per second; overrides faceDirection.
  spin?: number;
};

// Projectile art is drawn at 80% of its pixel size unless a definition says
// otherwise. Looks only; hitboxes are set separately.
export const DEFAULT_PROJECTILE_SCALE = 0.8;

const SMALL = { r: 0.15 };
const MAGIC_SOUND = {
  fire: "magicFire",
  hitPlayer: "hitPlayer",
  hitEnemy: "hitEnemy",
} as const;
const ARROW_SOUND = { ...MAGIC_SOUND, fire: "arrowFire" } as const;

export const projectiles = {
  bolt: {
    speed: 12,
    damage: [20, 30],
    lifetime: 0.6,
    hitbox: SMALL,
    sprite: { name: "bolt" },
    sound: MAGIC_SOUND,
    faceDirection: true,
  },
  // Covers far more than a tile per tick, to check it still stops at walls.
  fastBolt: {
    speed: 40,
    damage: [10, 15],
    lifetime: 0.35,
    hitbox: { r: 0.12 },
    sprite: { name: "bolt" },
    sound: MAGIC_SOUND,
    faceDirection: true,
  },
  wavy: {
    speed: 8,
    damage: [15, 25],
    lifetime: 1,
    hitbox: { r: 0.2 },
    sprite: { name: "orb" },
    sound: MAGIC_SOUND,
    wave: { amplitude: 0.5, frequency: 2 },
  },
  tightWave: {
    speed: 10,
    damage: [12, 18],
    lifetime: 0.8,
    hitbox: SMALL,
    sprite: { name: "bolt" },
    sound: MAGIC_SOUND,
    wave: { amplitude: 0.25, frequency: 6 },
    faceDirection: true,
  },
  accelerating: {
    speed: 2,
    damage: [25, 35],
    lifetime: 1,
    hitbox: SMALL,
    sprite: { name: "bolt" },
    sound: MAGIC_SOUND,
    acceleration: 40,
    maxSpeed: 20,
    faceDirection: true,
  },
  // Slows to a crawl and lingers.
  slowing: {
    speed: 14,
    damage: [30, 40],
    lifetime: 2,
    hitbox: { r: 0.2 },
    sprite: { name: "orb" },
    sound: MAGIC_SOUND,
    acceleration: -20,
    minSpeed: 1,
  },
  spiral: {
    speed: 6,
    damage: [15, 20],
    lifetime: 2,
    hitbox: SMALL,
    sprite: { name: "bolt" },
    sound: MAGIC_SOUND,
    turnRate: Math.PI,
    faceDirection: true,
  },
  boomerang: {
    speed: 10,
    damage: [20, 30],
    lifetime: 1.2,
    hitbox: { r: 0.25 },
    sprite: { name: "star" },
    sound: MAGIC_SOUND,
    boomerang: true,
    spin: 4 * Math.PI,
  },
  spinningStar: {
    speed: 7,
    damage: [15, 25],
    lifetime: 1.2,
    hitbox: { r: 0.25 },
    sprite: { name: "star" },
    sound: MAGIC_SOUND,
    spin: 3 * Math.PI,
  },
  // Flies through walls, glowing so it's easy to follow behind them.
  ghost: {
    speed: 9,
    damage: [10, 20],
    lifetime: 1,
    hitbox: { r: 0.2 },
    sprite: {
      name: "orb",
      outline: {
        color: [0.6, 0.9, 1, 1],
        glow: { radius: 1.5, pulseHz: 3 },
      },
    },
    sound: MAGIC_SOUND,
    walls: "pass",
  },
  // Extreme Prejudice's shard: speeds up while curving, weaving and
  // spinning, glowing and pulsing, so a full ring of them swirls outward.
  prejudice: {
    speed: 6,
    damage: [25, 40],
    lifetime: 1.4,
    hitbox: { r: 0.2 },
    sprite: {
      name: "prejudice",
      outline: {
        color: [1, 0.3, 0.9, 1],
        glow: { radius: 1.5, pulseHz: 6 },
      },
    },
    sound: MAGIC_SOUND,
    acceleration: 8,
    maxSpeed: 13,
    turnRate: 0.75 * Math.PI,
    wave: { amplitude: 0.4, frequency: 3 },
    spin: 6 * Math.PI,
  },
  // Enemy shots, outlined red so they're easy to tell from the player's.
  slimeBall: {
    speed: 5,
    damage: [15, 20],
    lifetime: 1.6,
    hitbox: { r: 0.25 },
    sprite: {
      name: "orb",
      scale: 1,
      outline: { color: [0.9, 0.15, 0.15, 1] },
    },
    sound: MAGIC_SOUND,
  },
  arrow: {
    speed: 10,
    damage: [25, 35],
    lifetime: 1,
    hitbox: SMALL,
    sprite: { name: "bolt", outline: { color: [0.9, 0.15, 0.15, 1] } },
    sound: ARROW_SOUND,
    faceDirection: true,
  },
  // Goes through everything it hits.
  lance: {
    speed: 14,
    damage: [30, 40],
    lifetime: 0.7,
    hitbox: SMALL,
    sprite: { name: "bolt", scale: 1.2 },
    sound: MAGIC_SOUND,
    pierces: true,
    faceDirection: true,
  },
  // Skids along walls instead of stopping.
  skidding: {
    speed: 10,
    damage: [15, 20],
    lifetime: 1.5,
    hitbox: { r: 0.2 },
    sprite: { name: "orb" },
    sound: MAGIC_SOUND,
    walls: "slide",
  },
} satisfies Record<string, ProjectileDef>;

export type ProjectileId = keyof typeof projectiles;

export const projectileIds = Object.keys(projectiles) as ProjectileId[];

export function projectileDef(id: ProjectileId): ProjectileDef {
  return projectiles[id];
}
