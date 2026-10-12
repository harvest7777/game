import type {
  Blocked,
  Hitbox,
  Position,
  PreviousPosition,
  Solid,
  Velocity,
  WallResponse,
} from "./movement/components";
import { createCamera, type Camera } from "./camera/resource";
import type { Health } from "./combat/components";
import type { Brain, Enemy } from "./enemy/components";
import { createEvents, type Events } from "./events";
import type { Input } from "./input/actions";
import type { PlayerControlled, Speed } from "./input/components";
import type { Projectile, Shooter, Team } from "./projectile/components";
import type { Facing, Rotation, Sprite } from "./sprite/components";
import type { FloatingText } from "./text/components";
import type { Tiles } from "./tiles";

export type Entity = number;

// Per-component storage keyed by entity. Backed by a Map for now; anything
// with this shape (e.g. a sparse set) can replace it without touching systems.
export type Store<T> = Pick<
  Map<Entity, T>,
  "get" | "set" | "has" | "delete" | "clear" | "size" | typeof Symbol.iterator
>;

export function createStore<T>(): Store<T> {
  return new Map<Entity, T>();
}

export type Components = {
  position: Store<Position>;
  velocity: Store<Velocity>;
  hitbox: Store<Hitbox>;
  previousPosition: Store<PreviousPosition>;
  solid: Store<Solid>;
  wallResponse: Store<WallResponse>;
  blocked: Store<Blocked>;
  playerControlled: Store<PlayerControlled>;
  speed: Store<Speed>;
  sprite: Store<Sprite>;
  facing: Store<Facing>;
  rotation: Store<Rotation>;
  projectile: Store<Projectile>;
  shooter: Store<Shooter>;
  team: Store<Team>;
  health: Store<Health>;
  enemy: Store<Enemy>;
  brain: Store<Brain>;
  // Who this entity is after, e.g. what an enemy aims at.
  target: Store<Entity>;
  floatingText: Store<FloatingText>;
};

export type World = {
  nextEntity: Entity;
  components: Components;
  tiles: Tiles;
  input: Input;
  camera: Camera;
  events: Events;
  // Random number in [0, 1), for anything random like damage rolls. Tests
  // swap it for a predictable one.
  random: () => number;
};

export type System = (world: World, dt: number) => void;

export function createWorld(
  tiles: Tiles,
  random: () => number = Math.random,
): World {
  return {
    nextEntity: 0,
    tiles,
    input: { held: new Set() },
    camera: createCamera(),
    events: createEvents(),
    random,
    components: {
      position: createStore(),
      velocity: createStore(),
      hitbox: createStore(),
      previousPosition: createStore(),
      solid: createStore(),
      wallResponse: createStore(),
      blocked: createStore(),
      playerControlled: createStore(),
      speed: createStore(),
      sprite: createStore(),
      facing: createStore(),
      rotation: createStore(),
      projectile: createStore(),
      shooter: createStore(),
      team: createStore(),
      health: createStore(),
      enemy: createStore(),
      brain: createStore(),
      target: createStore(),
      floatingText: createStore(),
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
