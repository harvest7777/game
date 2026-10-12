import { cameraSystem } from "./camera/system";
import { containerAccessSystem } from "./container/system";
import { gravestoneSystem } from "./character/system";
import { hazardSystem } from "./hazard/system";
import { deathPortalSystem, portalSystem } from "./portal/system";
import { cleanupSystem } from "./cleanup";
import { damageSystem, deathSystem } from "./combat/damage";
import { recentlyHurtSystem } from "./combat/hurt";
import { hitSystem } from "./combat/hits";
import { aggroSystem } from "./enemy/aggro";
import { sleepSystem } from "./enemy/sleep";
import { brainSystem } from "./enemy/brain";
import { phaseSystem } from "./enemy/phaseSystem";
import { bossActionSystem } from "./enemy/actionSystem";
import { damageTextSystem, floatingTextSystem } from "./text/system";
import { clearEvents } from "./events";
import { outboxSystem } from "./outbox";
import { autoFireSystem, playerInputSystem } from "./input/system";
import { inventorySystem } from "./inventory/system";
import { lootBagSystem, lootSystem } from "./loot/system";
import { movementSystem } from "./movement/system";
import { shootSystem } from "./projectile/shoot";
import { projectileSystem } from "./projectile/system";
import { projectileWallHitSystem } from "./projectile/walls";
import { soundSystem } from "./sound/system";
import { facingSystem } from "./sprite/system";
import type { System, World } from "./world";
import { statSystem } from "./stats/system";

// Every system, in the order they run each tick. This is the only place that
// knows about all of them, so systems never need to import each other.
// Camera turns first. Stat commands and regeneration apply before input, so
// maxing Speed affects movement immediately. Input and projectiles set
// velocity before movement applies it, and facing follows it.
// Item commands apply before shooting, so a weapon swap fires on the same
// tick, and portal requests are answered from where the player stood. Bag
// lifetime and empty cleanup follow transfers. Proximity container
// access updates after movement and only writes access state, and hazardous
// ground burns whoever ends the move standing on it. Enemies far from every
// player go to sleep, or wake, before anything else about enemies runs.
// Enemies pick
// targets, move through their phases, then their brains steer
// toward or around them, before shooting aims at them. Shooting aims before
// facing, so this tick's aim decides which way a shooter
// faces, and fires before projectiles are steered, so a new shot already
// moves on the tick it's fired. Hits are found once everything has moved;
// each step of hit, damage, death and removal reads the events the step
// before it recorded. Floating text ages before new damage numbers are
// spawned, so a new number starts at age 0. Gravestones and death portals
// go down before cleanup removes whoever died.
export const tickSystems: System[] = [
  cameraSystem,
  statSystem,
  playerInputSystem,
  inventorySystem,
  portalSystem,
  lootBagSystem,
  autoFireSystem,
  sleepSystem,
  aggroSystem,
  phaseSystem,
  bossActionSystem,
  brainSystem,
  shootSystem,
  facingSystem,
  projectileSystem,
  movementSystem,
  containerAccessSystem,
  hazardSystem,
  hitSystem,
  projectileWallHitSystem,
  damageSystem,
  recentlyHurtSystem,
  floatingTextSystem,
  damageTextSystem,
  lootSystem,
  deathPortalSystem,
  deathSystem,
  gravestoneSystem,
  soundSystem,
  outboxSystem,
  cleanupSystem,
];

// Milliseconds each system has spent, by its name, for profiling.
export type SystemTimings = Record<string, number>;

// Events only last the tick they happen in. Given `timings`, adds each
// system's time to it; without, nothing is timed.
export function runTick(
  world: World,
  dt: number,
  timings?: SystemTimings,
): void {
  clearEvents(world.events);
  if (!timings) {
    for (const system of tickSystems) system(world, dt);
    return;
  }
  for (const system of tickSystems) {
    const start = performance.now();
    system(world, dt);
    timings[system.name] =
      (timings[system.name] ?? 0) + performance.now() - start;
  }
}
