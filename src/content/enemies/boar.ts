import { defineEnemy } from "../../ecs/enemy/definitions";
import { slimeSpit } from "../weapons/slimeSpit";
import { OUTLINED } from "./shared";

// Paces around, then charges at you in bursts, spitting as it goes.
export const boar = defineEnemy({
  sprite: { art: { kind: "static", file: "enemies/boar" }, outline: OUTLINED },
  hitbox: { r: 0.4 },
  health: 220,
  speed: 3,
  weapon: slimeSpit,
  detectRange: 8,
  idle: { kind: "wander", radius: 2 },
  aggro: {
    kind: "charge",
    windup: 0.6,
    duration: 0.5,
    speedScale: 3.5,
    rest: 1.2,
  },
  deathSound: "enemyDeath",
});
