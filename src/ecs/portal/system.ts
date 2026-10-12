import { nearestSafeSpot } from "../tiles";
import type { World } from "../world";
import { portalAt, spawnPortal } from "./spawn";

// Asks the outside world to take the player through the portal it's
// standing on, when it asks to enter one. The simulation only says where to;
// swapping levels happens outside it.
export function portalSystem(world: World, _dt: number): void {
  if (!world.input.commands.some((c) => c.kind === "enterPortal")) return;
  for (const [entity] of world.components.playerControlled) {
    const at = world.components.position.get(entity);
    if (!at || !world.components.character.has(entity)) continue;
    const portal = portalAt(world, at);
    if (portal === undefined) continue;
    const { to } = world.components.portal.get(portal)!.def;
    world.outbox.push({ kind: "travel", entity, to });
  }
}

// Opens a portal where each enemy with a `deathPortal` died, like the way
// home when a dungeon's boss falls, moved to the nearest safe ground if it
// died over lava. Runs before cleanup removes the dead.
export function deathPortalSystem(world: World, _dt: number): void {
  for (const { entity } of world.events.deaths) {
    const def = world.components.enemy.get(entity)?.def.deathPortal;
    const at = world.components.position.get(entity);
    if (def && at) spawnPortal(world, def, nearestSafeSpot(world.tiles, at));
  }
}
