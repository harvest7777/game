import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { DEMON_BLADE_ART, HIT_SOUND } from "./shared";

// Malphas's aimed lance: fast and painful, telegraphed by its cast.
export const malphasLance: ProjectileDef = {
  speed: 12,
  damage: [50, 65],
  lifetime: 1.2,
  hitbox: { r: 0.3 },
  sprite: { art: DEMON_BLADE_ART, scale: 1.2, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  faceDirection: true,
};
