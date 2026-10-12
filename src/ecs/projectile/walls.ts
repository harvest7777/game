import type { World } from "../world";

// Resolves projectiles that movement stopped against a wall. Entity hits run
// first: if a non-piercing shot touched a target on its way to the wall, that
// hit already queued it for removal and wins over the later wall contact.
export function projectileWallHitSystem(world: World, _dt: number): void {
  const { blocked, projectile } = world.components;
  const despawning = new Set(world.events.despawns);

  for (const [entity] of blocked) {
    const shot = projectile.get(entity);
    if (!shot || despawning.has(entity)) continue;

    world.events.despawns.push(entity);
    despawning.add(entity);
  }
}
