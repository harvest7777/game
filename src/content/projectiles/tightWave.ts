import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

export const tightWave: ProjectileDef = {
  speed: 10,
  damage: [12, 18],
  lifetime: 0.8,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  wave: { amplitude: 0.25, frequency: 6 },
  faceDirection: true,
};
