import type { ProjectileDef } from "../../ecs/projectile/definitions";
import type { StaticArt } from "../../ecs/sprite/art";

// A small round hitbox most shots use.
export const SMALL = { r: 0.15 };

// What most shots sound like hitting something.
export const HIT_SOUND: ProjectileDef["sound"] = {
  hitPlayer: "hitPlayer",
  hitEnemy: "hitEnemy",
};

// Projectile art, shared by many kinds of shot. Rotated art points right.
export const BOLT_ART: StaticArt = { kind: "static", file: "projectiles/bolt" };
export const ORB_ART: StaticArt = { kind: "static", file: "projectiles/orb" };
export const STAR_ART: StaticArt = { kind: "static", file: "projectiles/star" };
export const PREJUDICE_ART: StaticArt = {
  kind: "static",
  file: "projectiles/prejudice",
};
export const FIREBALL_ART: StaticArt = {
  kind: "static",
  file: "projectiles/fireball",
};
export const DEMON_BLADE_ART: StaticArt = {
  kind: "static",
  file: "projectiles/demon-blade",
};
