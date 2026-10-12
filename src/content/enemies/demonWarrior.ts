import { defineEnemy } from "../../ecs/enemy/definitions";
import { STAT, stat } from "../../ecs/stats/components";
import { demonLoot } from "../loot/pools";
import { demonSlash } from "../weapons/demonSlash";
import { creatureArt, OUTLINED } from "./shared";

// Dashes in and sweeps its blade: deadly up close, harmless at range.
export const demonWarrior = defineEnemy({
  sprite: {
    art: creatureArt("demon-warrior"),
    outline: OUTLINED,
  },
  hitbox: { r: 0.4 },
  stats: {
    [STAT.HEALTH]: stat(900),
    [STAT.DEFENSE]: stat(8),
  },
  speed: 3,
  weapon: demonSlash,
  detectRange: 9,
  idle: { kind: "wander", radius: 3 },
  aggro: {
    kind: "charge",
    windup: 0.5,
    duration: 0.45,
    speedScale: 3.5,
    rest: 1,
  },
  loot: demonLoot,
  deathSound: "enemyDeath",
});
