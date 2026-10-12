import { defineEnemy } from "../../ecs/enemy/definitions";
import { OUTLINED } from "./shared";

// Stands still and takes hits.
export const dummy = defineEnemy({
  sprite: { art: { kind: "static", file: "enemies/dummy" }, outline: OUTLINED },
  hitbox: { r: 0.4 },
  health: 300,
  speed: 0,
  detectRange: 0,
  idle: { kind: "stationary" },
  aggro: { kind: "stationary" },
  deathSound: "enemyDeath",
});
