import type { World } from "../world";

// Points each entity's facing, RotMG style: a shooter faces where it's aiming
// (so you can walk one way while shooting another); anything else faces the
// way it's trying to move. Uses velocity rather than actual movement, so
// walking into a wall still faces the wall. Entities that aren't moving or
// aiming keep their last facing.
export function facingSystem(world: World, _dt: number): void {
  const { facing, velocity, shooter, playerControlled, autoFire } =
    world.components;
  for (const [entity, current] of facing) {
    const shooting =
      !playerControlled.has(entity) || autoFire.get(entity) !== false;
    const v =
      (shooting ? shooter.get(entity)?.aim : undefined) ?? velocity.get(entity);
    if (!v) continue;
    const length = Math.hypot(v.x, v.y);
    if (length === 0) continue;
    current.x = v.x / length;
    current.y = v.y / length;
  }
}
