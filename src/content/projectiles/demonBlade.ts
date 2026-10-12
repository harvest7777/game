import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { DEMON_BLADE_ART, HIT_SOUND } from "./shared";

// A demon warrior's slash: hard-hitting, but it barely leaves its
// arm.
export const demonBlade: ProjectileDef = {
  speed: 8,
  damage: [40, 50],
  lifetime: 0.35,
  hitbox: { r: 0.3 },
  sprite: { art: DEMON_BLADE_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  faceDirection: true,
};
