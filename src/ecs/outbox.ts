import type { SlotRef } from "./inventory/components";
import type { Entity, World } from "./world";

// What the simulation tells the world outside it: things like sound, network
// messages and HUD feedback that react to what happened. Unlike events,
// it isn't cleared every tick; whoever is listening drains it after running
// the ticks for a frame, so nothing from an earlier tick in the same frame is
// missed.
export type OutboxMessage = { kind: "itemMoved"; entity: Entity; to: SlotRef };

// Copies this tick's events that the outside world cares about into the
// outbox. Runs at the end of the tick.
export function outboxSystem(world: World, _dt: number): void {
  for (const { entity, to } of world.events.itemsMoved) {
    world.outbox.push({ kind: "itemMoved", entity, to });
  }
}
