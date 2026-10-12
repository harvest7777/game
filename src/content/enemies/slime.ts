import { defineEnemy } from "../../ecs/enemy/definitions";
import { slimeSpit } from "../weapons/slimeSpit";
import { OUTLINED } from "./shared";

export const slime = defineEnemy({
  sprite: { art: { kind: "static", file: "enemies/slime" }, outline: OUTLINED },
  hitbox: { r: 0.4 },
  health: 150,
  speed: 2,
  weapon: slimeSpit,
  detectRange: 7,
  idle: { kind: "wander", radius: 2.5 },
  aggro: { kind: "chase", stopAt: 2.5 },
  deathSound: "enemyDeath",
});
