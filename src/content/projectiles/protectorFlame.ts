import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { FIREBALL_ART, HIT_SOUND } from "./shared";

// A Malphas Protector's flame, curling as it flies, so a ring of
// them spins out as a pinwheel.
export const protectorFlame: ProjectileDef = {
  speed: 6,
  damage: [40, 55],
  lifetime: 1.8,
  hitbox: { r: 0.25 },
  sprite: { art: FIREBALL_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  turnRate: 1.2,
};
