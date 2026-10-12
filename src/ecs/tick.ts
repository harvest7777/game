import { cameraSystem } from "./camera/system";
import { cleanupSystem } from "./cleanup";
import { damageSystem, deathSystem } from "./combat/damage";
import { hitSystem } from "./combat/hits";
import { aggroSystem } from "./enemy/aggro";
import { brainSystem } from "./enemy/brain";
import { clearEvents } from "./events";
import { playerInputSystem } from "./input/system";
import { movementSystem } from "./movement/system";
import { shootSystem } from "./projectile/shoot";
import { projectileSystem } from "./projectile/system";
import { facingSystem } from "./sprite/system";
import type { System, World } from "./world";

// Every system, in the order they run each tick. This is the only place that
// knows about all of them, so systems never need to import each other.
// Camera turns before input so movement uses this tick's angle; input and
// projectiles set velocity before movement applies it, and facing follows it.
// Enemies pick targets, then their brains steer toward or around them, before
// shooting aims at them. Shooting aims before
// facing, so this tick's aim decides which way a shooter
// faces, and fires before projectiles are steered, so a new shot already
// moves on the tick it's fired. Hits are found once everything has moved;
// each step of hit, damage, death and removal reads the events the step
// before it recorded.
const systems: System[] = [
  cameraSystem,
  playerInputSystem,
  aggroSystem,
  brainSystem,
  shootSystem,
  facingSystem,
  projectileSystem,
  movementSystem,
  hitSystem,
  damageSystem,
  deathSystem,
  cleanupSystem,
];

// Events only last the tick they happen in.
export function runTick(world: World, dt: number): void {
  clearEvents(world.events);
  for (const system of systems) system(world, dt);
}
