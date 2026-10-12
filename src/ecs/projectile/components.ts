import type { Position } from "../movement/components";
import type { Vec2 } from "../shared/physics/math";
import type { Entity } from "../world";
import type { ProjectileId } from "./definitions";

// Which side something is on. Decides what a projectile can hit, so it's
// copied onto the projectile when fired: the owner may be gone before the
// projectile is.
export type Team = "player" | "enemy";

// A projectile in flight. Its kind (`def`) says how it moves; this says where
// and which way it was fired and how long ago, which is all its path needs.
export type Projectile = {
  def: ProjectileId;
  // Who fired it, for kill credit and on-hit effects later.
  owner: Entity;
  team: Team;
  origin: Position;
  // Unit vector it was fired along.
  direction: Vec2;
  // Seconds since it was fired.
  age: number;
};

// Fires `projectile` automatically, `rate` times per second. `cooldown` is
// seconds until the next shot.
export type Shooter = {
  projectile: ProjectileId;
  rate: number;
  cooldown: number;
};
