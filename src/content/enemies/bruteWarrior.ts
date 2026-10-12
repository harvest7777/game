import { defineEnemy } from "../../ecs/enemy/definitions";
import { STAT, stat } from "../../ecs/stats/components";
import { bruteLoot } from "../loot/pools";
import { bruteRing } from "../weapons/bruteRing";
import { bruteShotgun } from "../weapons/bruteShotgun";
import { OUTLINED } from "./shared";

// A brute in a helmet that won't stay put: pounds away up close, then
// charges and lands in a ring of blasts.
export const bruteWarrior = defineEnemy({
  sprite: {
    art: { kind: "static", file: "enemies/brute-warrior" },
    outline: OUTLINED,
  },
  hitbox: { r: 0.45 },
  stats: {
    [STAT.HEALTH]: stat(1400),
    [STAT.DEFENSE]: stat(12),
  },
  speed: 2.8,
  weapon: bruteShotgun,
  detectRange: 9,
  idle: { kind: "wander", radius: 2 },
  aggro: { kind: "chase", stopAt: 0.8 },
  phases: {
    start: "pound",
    list: {
      pound: { next: [{ to: "charge", when: { after: 4 } }] },
      charge: {
        aggro: {
          kind: "charge",
          windup: 0.6,
          duration: 0.6,
          speedScale: 4,
          rest: 10,
        },
        weapon: null,
        next: [{ to: "land", when: { after: 1.2 } }],
      },
      land: {
        aggro: { kind: "stationary" },
        weapon: bruteRing,
        next: [{ to: "pound", when: { after: 0.6 } }],
      },
    },
  },
  loot: bruteLoot,
  deathSound: "enemyDeath",
});
