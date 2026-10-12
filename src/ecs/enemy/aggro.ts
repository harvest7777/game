import type { Entity, World } from "../world";
import { enemyDef } from "./definitions";

// Picks each enemy's target: the nearest living thing on another team within
// its detection range. With nothing in range it has no target, so it stops
// chasing and shooting until something comes back.
export function aggroSystem(world: World, _dt: number): void {
  const { enemy, position, team, health, target } = world.components;

  for (const [entity, e] of enemy) {
    const at = position.get(entity);
    if (!at) continue;
    const side = team.get(entity);
    const range = enemyDef(e.def).detectRange;

    let nearest: Entity | undefined;
    let nearestDistance = Infinity;
    for (const [other, h] of health) {
      const otherSide = team.get(other);
      if (other === entity || otherSide === undefined || otherSide === side) {
        continue;
      }
      const otherAt = position.get(other);
      if (!otherAt || h.hp <= 0) continue;
      const distance = Math.hypot(otherAt.x - at.x, otherAt.y - at.y);
      if (distance <= range && distance < nearestDistance) {
        nearest = other;
        nearestDistance = distance;
      }
    }

    if (nearest === undefined) target.delete(entity);
    else target.set(entity, nearest);
  }
}
