import type { Vec2 } from "./shared/physics/math";
import {
  spawn,
  type Components,
  type Entity,
  type Store,
  type World,
} from "./world";

// What only makes sense in the world an entity left: who it was after, the
// container it was looking in, and how long it had stood on lava.
const LEFT_BEHIND: readonly (keyof Components)[] = [
  "target",
  "containerAccess",
  "hazardExposure",
];

// Every store holds its own type; moving a value between the same store in
// two worlds keeps it.
type AnyStore = Store<unknown>;

// Moves `entity` and everything it has (stats, gear, inventory) out of
// `from` and into `to`, standing still at `at`, and returns its id there.
// The camera comes along if it was following it.
export function travel(
  from: World,
  to: World,
  entity: Entity,
  at: Vec2,
): Entity {
  const arrived = spawn(to);
  for (const name of Object.keys(from.components) as (keyof Components)[]) {
    const store = from.components[name] as AnyStore;
    if (!store.has(entity)) continue;
    if (!LEFT_BEHIND.includes(name)) {
      (to.components[name] as AnyStore).set(arrived, store.get(entity));
    }
    store.delete(entity);
  }
  to.components.position.set(arrived, { ...at });
  to.components.previousPosition.set(arrived, { ...at });
  if (to.components.velocity.has(arrived)) {
    to.components.velocity.set(arrived, { x: 0, y: 0 });
  }
  if (from.camera.target === entity) {
    to.camera = { ...from.camera, target: arrived };
  }
  return arrived;
}
