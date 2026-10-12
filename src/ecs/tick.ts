import { cameraSystem } from "./camera/system";
import { playerInputSystem } from "./input/system";
import { movementSystem } from "./movement/system";
import { facingSystem } from "./sprite/system";
import type { System, World } from "./world";

// Every system, in the order they run each tick. This is the only place that
// knows about all of them, so systems never need to import each other.
// Camera turns before input so movement uses this tick's angle; input sets
// velocity before movement applies it and facing follows it.
const systems: System[] = [
  cameraSystem,
  playerInputSystem,
  facingSystem,
  movementSystem,
];

export function runTick(world: World, dt: number): void {
  for (const system of systems) system(world, dt);
}
