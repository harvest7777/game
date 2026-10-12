import { defineEnemy } from "../../ecs/enemy/definitions";
import { OUTLINED } from "./shared";
import { STAT, stat } from "../../ecs/stats/components";

// Stands still and takes hits.
export const dummy = defineEnemy({
  sprite: { art: { kind: "static", file: "enemies/dummy" }, outline: OUTLINED },
  hitbox: { r: 0.4 },
  stats: {
    [STAT.HEALTH]: stat(300),
    [STAT.DEFENSE]: stat(0),
  },
  speed: 0,
  detectRange: 0,
  idle: { kind: "stationary" },
  aggro: { kind: "stationary" },
  deathSound: "enemyDeath",
});
