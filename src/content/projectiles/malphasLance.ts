import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { DEMON_BLADE_ART, ENEMY_SHOT, HIT_SOUND } from "./shared";

// Malphas's aimed lance: fast and painful, telegraphed by its cast.
export const malphasLance: ProjectileDef = {
  speed: 12,
  damage: [70, 90],
  lifetime: 1.2,
  hitbox: { r: 0.3 },
  sprite: { art: DEMON_BLADE_ART, scale: 1.2, outline: ENEMY_SHOT },
  sound: HIT_SOUND,
  faceDirection: true,
};
