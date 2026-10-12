import { defineEnemy } from "../../ecs/enemy/definitions";
import { STAT, stat } from "../../ecs/stats/components";
import { demonLoot } from "../loot/pools";
import { mageRing } from "../weapons/mageRing";
import { creatureArt, OUTLINED } from "./shared";

// Keeps its distance, casting slow rings of orbs that speed up.
export const demonMage = defineEnemy({
  sprite: {
    art: creatureArt("demon-mage"),
    outline: OUTLINED,
  },
  hitbox: { r: 0.35 },
  stats: {
    [STAT.HEALTH]: stat(550),
    [STAT.DEFENSE]: stat(4),
  },
  speed: 2,
  weapon: mageRing,
  detectRange: 11,
  idle: { kind: "stationary" },
  aggro: { kind: "orbit", radius: 6 },
  loot: demonLoot,
  deathSound: "enemyDeath",
});
