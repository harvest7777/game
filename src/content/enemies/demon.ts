import { defineEnemy } from "../../ecs/enemy/definitions";
import { STAT, stat } from "../../ecs/stats/components";
import { demonLoot } from "../loot/pools";
import { demonVolley } from "../weapons/demonVolley";
import { creatureArt, OUTLINED } from "./shared";

// Walks you down and lobs fans of heavy fireballs.
export const demon = defineEnemy({
  sprite: { art: creatureArt("demon"), outline: OUTLINED },
  hitbox: { r: 0.4 },
  stats: {
    [STAT.HEALTH]: stat(700),
    [STAT.DEFENSE]: stat(6),
  },
  speed: 2.5,
  weapon: demonVolley,
  detectRange: 10,
  idle: { kind: "wander", radius: 3 },
  aggro: { kind: "chase", stopAt: 3 },
  loot: demonLoot,
  deathSound: "enemyDeath",
});
