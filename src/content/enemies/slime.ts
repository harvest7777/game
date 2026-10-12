import { defineEnemy } from "../../ecs/enemy/definitions";
import { slimeSpit } from "../weapons/slimeSpit";
import { slimeLoot } from "../loot/pools";
import { OUTLINED } from "./shared";
import { STAT, stat } from "../../ecs/stats/components";

export const slime = defineEnemy({
  sprite: { art: { kind: "static", file: "enemies/slime" }, outline: OUTLINED },
  hitbox: { r: 0.4 },
  stats: {
    [STAT.HEALTH]: stat(150),
    [STAT.DEFENSE]: stat(0),
  },
  speed: 2,
  weapon: slimeSpit,
  detectRange: 7,
  idle: { kind: "wander", radius: 2.5 },
  aggro: { kind: "chase", stopAt: 2.5 },
  loot: slimeLoot,
  deathSound: "enemyDeath",
});
