import { defineEnemy } from "../../ecs/enemy/definitions";
import { archerVolley } from "../weapons/archerVolley";
import { archerLoot } from "../loot/pools";
import { OUTLINED } from "./shared";
import { STAT, stat } from "../../ecs/stats/components";

export const archer = defineEnemy({
  sprite: {
    art: { kind: "static", file: "enemies/archer" },
    outline: OUTLINED,
  },
  hitbox: { r: 0.35 },
  stats: {
    [STAT.HEALTH]: stat(100),
    [STAT.DEFENSE]: stat(1),
  },
  speed: 3,
  weapon: archerVolley,
  detectRange: 9,
  idle: { kind: "wander", radius: 3 },
  // Keeps its distance, circling while it shoots.
  aggro: { kind: "orbit", radius: 5 },
  loot: archerLoot,
  deathSound: "enemyDeath",
});
