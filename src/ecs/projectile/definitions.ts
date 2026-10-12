import type { Speed } from "../input/components";
import type { Hitbox, WallResponse } from "../movement/components";
import type { Sprite } from "../sprite/components";
import type { SoundId } from "../../audio/assets";

// What a kind of projectile is. Shared by every shot of that kind; each
// projectile entity only keeps where and which way it was fired and how old
// it is (see Projectile). Each kind is its own file under
// src/content/projectiles.
//
// The path is a pure function of age, built from these parts:
// - It travels along a track at `speed`, changing by `acceleration` and held
//   between `minSpeed` and `maxSpeed`.
// - `turnRate` curves the track. It's radians per second at the starting
//   speed; the curve's shape stays the same if the speed changes.
// - `turnAcceleration` changes the turn rate as it flies, for curves that
//   aren't perfect arcs.
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
  sprite: Pick<Sprite, "art" | "outline" | "scale">;
  // Played where it hits something, depending on whose side that is.
  sound: {
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
  // Radians per second², changing the turn rate over the flight: against
  // turnRate it straightens out, with it the curve tightens. Paths that use
  // it are worked out numerically rather than as an exact arc.
  turnAcceleration?: number;
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
