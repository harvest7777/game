import { despawn, type World } from "./world";

// Removes everything queued for removal this tick. Runs last.
export function cleanupSystem(world: World, _dt: number): void {
  for (const entity of new Set(world.events.despawns)) despawn(world, entity);
}
