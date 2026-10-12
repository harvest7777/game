import type { Hitbox, Position, Velocity } from "./movement/components";

export type Entity = number;

// Per-component storage keyed by entity. Backed by a Map for now; anything
// with this shape (e.g. a sparse set) can replace it without touching systems.
export type Store<T> = Pick<
  Map<Entity, T>,
  "get" | "set" | "has" | "delete" | "size" | typeof Symbol.iterator
>;

export function createStore<T>(): Store<T> {
  return new Map<Entity, T>();
}

export type Components = {
  position: Store<Position>;
  velocity: Store<Velocity>;
  hitbox: Store<Hitbox>;
};

export type World = {
  nextEntity: Entity;
  components: Components;
};

export type System = (world: World, dt: number) => void;

export function createWorld(): World {
  return {
    nextEntity: 0,
    components: {
      position: createStore(),
      velocity: createStore(),
      hitbox: createStore(),
    },
  };
}

export function spawn(world: World): Entity {
  return world.nextEntity++;
}

export function despawn(world: World, entity: Entity): void {
  for (const store of Object.values(world.components)) {
    store.delete(entity);
  }
}
