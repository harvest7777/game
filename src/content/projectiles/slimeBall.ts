import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// A slime's lobbed ball.
export const slimeBall: ProjectileDef = {
  speed: 5,
  damage: [15, 20],
  lifetime: 1.6,
  hitbox: { r: 0.25 },
  sprite: {
    art: ORB_ART,
    scale: 1,
    outline: BLACK_OUTLINE,
  },
  sound: HIT_SOUND,
};
