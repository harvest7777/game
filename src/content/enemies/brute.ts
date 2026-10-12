import { defineEnemy } from "../../ecs/enemy/definitions";
import { STAT, stat } from "../../ecs/stats/components";
import { bruteLoot } from "../loot/pools";
import { bruteShotgun } from "../weapons/bruteShotgun";
import { creatureArt, OUTLINED } from "./shared";

// A hulk that walks right up to you and blasts point-blank.
export const brute = defineEnemy({
  sprite: { art: creatureArt("brute"), outline: OUTLINED },
  hitbox: { r: 0.45 },
  stats: {
    [STAT.HEALTH]: stat(1000),
    [STAT.DEFENSE]: stat(10),
  },
  speed: 2.6,
  weapon: bruteShotgun,
  detectRange: 8,
  roams: true,
  idle: { kind: "wander", radius: 2 },
  aggro: { kind: "chase", stopAt: 0.8 },
  loot: bruteLoot,
  deathSound: "enemyDeath",
});
