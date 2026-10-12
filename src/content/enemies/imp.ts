import { defineEnemy } from "../../ecs/enemy/definitions";
import { STAT, stat } from "../../ecs/stats/components";
import { impLoot } from "../loot/pools";
import { impShot } from "../weapons/impShot";
import { creatureArt, OUTLINED } from "./shared";

// Small and quick, in packs: circles close and peppers you with little
// fireballs.
export const imp = defineEnemy({
  sprite: { art: creatureArt("imp"), outline: OUTLINED },
  hitbox: { r: 0.3 },
  stats: {
    [STAT.HEALTH]: stat(200),
    [STAT.DEFENSE]: stat(0),
  },
  speed: 4.5,
  weapon: impShot,
  detectRange: 9,
  idle: { kind: "wander", radius: 2, speedScale: 0.7 },
  aggro: { kind: "orbit", radius: 3 },
  loot: impLoot,
  deathSound: "enemyDeath",
});
