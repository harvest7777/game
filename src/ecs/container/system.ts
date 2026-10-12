import type { Entity, World } from "../world";

// Selects the nearest proximity container each player is standing over.
// This system only writes access state: inventory applies transfers and the
// HUD decides how that state looks.
export function containerAccessSystem(world: World, _dt: number): void {
  const despawning = new Set(world.events.despawns);

  for (const [player] of world.components.playerControlled) {
    const at = world.components.position.get(player);
    const nearest = at
      ? nearestContainer(world, at.x, at.y, despawning)
      : undefined;
    if (nearest === undefined) world.components.containerAccess.delete(player);
    else world.components.containerAccess.set(player, { container: nearest });
  }
}

function nearestContainer(
  world: World,
  x: number,
  y: number,
  despawning: ReadonlySet<Entity>,
): Entity | undefined {
  let nearest: Entity | undefined;
  let nearestDistance = Infinity;

  for (const [entity, proximity] of world.components.proximityContainer) {
    if (despawning.has(entity)) continue;
    const container = world.components.container.get(entity);
    const at = world.components.position.get(entity);
    if (!container || !at || container.slots.every((item) => item === null)) {
      continue;
    }
    const dx = at.x - x;
    const dy = at.y - y;
    const distance = dx * dx + dy * dy;
    if (
      distance <= proximity.radius * proximity.radius &&
      (distance < nearestDistance ||
        (distance === nearestDistance &&
          (nearest === undefined || entity < nearest)))
    ) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  return nearest;
}
