import { cameraSystem } from "./camera/system";
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
// Shooting aims before facing, so this tick's aim decides which way a shooter
// faces, and fires before projectiles are steered, so a new shot already
// moves on the tick it's fired.
const systems: System[] = [
  cameraSystem,
  playerInputSystem,
  shootSystem,
  facingSystem,
  projectileSystem,
  movementSystem,
];

export function runTick(world: World, dt: number): void {
  for (const system of systems) system(world, dt);
}
