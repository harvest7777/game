import type { World } from "../world";

// Points each entity's facing along its velocity. Entities that aren't moving
// keep their last facing. Uses velocity rather than actual movement, so
// walking into a wall still faces the wall.
export function facingSystem(world: World, _dt: number): void {
  const { facing, velocity } = world.components;
  for (const [entity, current] of facing) {
    const v = velocity.get(entity);
    if (!v) continue;
    const length = Math.hypot(v.x, v.y);
    if (length === 0) continue;
    current.x = v.x / length;
    current.y = v.y / length;
  }
}
