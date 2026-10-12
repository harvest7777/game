import { defineEnemy } from "../../ecs/enemy/definitions";
import { STAT, stat } from "../../ecs/stats/components";
import { flamerBreath } from "../weapons/flamerBreath";

// A living flame Malphas calls in: fragile, but it rushes you and breathes
// fire. Drops nothing.
export const malphasFlamer = defineEnemy({
  sprite: {
    art: { kind: "static", file: "enemies/malphas-flamer" },
    outline: { color: [0.4, 0.05, 0, 1], glow: { radius: 1, pulseHz: 3 } },
  },
  hitbox: { r: 0.3 },
  stats: {
    [STAT.HEALTH]: stat(300),
    [STAT.DEFENSE]: stat(0),
  },
  speed: 4,
  weapon: flamerBreath,
  detectRange: 14,
  idle: { kind: "wander", radius: 2 },
  aggro: { kind: "chase", stopAt: 1 },
  deathSound: "enemyDeath",
});
