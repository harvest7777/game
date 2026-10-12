import { defineEnemy } from "../../ecs/enemy/definitions";
import { slimeSpit } from "../weapons/slimeSpit";
import { boarLoot } from "../loot/pools";
import { OUTLINED } from "./shared";
import { STAT, stat } from "../../ecs/stats/components";

// Paces around, then charges at you in bursts, spitting as it goes.
export const boar = defineEnemy({
  sprite: { art: { kind: "static", file: "enemies/boar" }, outline: OUTLINED },
  hitbox: { r: 0.4 },
  stats: {
    [STAT.HEALTH]: stat(220),
    [STAT.DEFENSE]: stat(3),
  },
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
  loot: boarLoot,
  deathSound: "enemyDeath",
});
