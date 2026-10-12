import { defineEnemy } from "../../ecs/enemy/definitions";
import { creatureArt } from "./shared";
import { STAT, stat } from "../../ecs/stats/components";
import { protectorLoot } from "../loot/pools";
import { demonVolley } from "../weapons/demonVolley";
import { protectorPinwheel } from "../weapons/protectorPinwheel";

// Malphas's hulking guard, holding the Abyss's side rooms: it lumbers
// around you spinning out pinwheels of curling flame, pausing now and then
// to hurl fireballs straight at you.
export const malphasProtector = defineEnemy({
  sprite: {
    art: creatureArt("malphas-protector"),
    scale: 2,
    outline: { color: [0, 0, 0, 1], glow: { radius: 1, pulseHz: 0.6 } },
  },
  hitbox: { r: 0.75 },
  stats: {
    [STAT.HEALTH]: stat(3000),
    [STAT.DEFENSE]: stat(12),
  },
  speed: 1.5,
  weapon: protectorPinwheel,
  detectRange: 10,
  roams: true,
  idle: { kind: "stationary" },
  aggro: { kind: "orbit", radius: 4 },
  phases: {
    start: "pinwheel",
    list: {
      pinwheel: { next: [{ to: "hurl", when: { after: 5 } }] },
      hurl: {
        aggro: { kind: "stationary" },
        weapon: demonVolley,
        next: [{ to: "pinwheel", when: { after: 2.5 } }],
      },
    },
  },
  loot: protectorLoot,
  deathSound: "bossDeath",
});
