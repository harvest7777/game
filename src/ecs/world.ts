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
import type { Invulnerable, Vulnerable } from "./combat/components";
import type { HazardExposure } from "./hazard/components";
import type { Character } from "./character/components";
import type { BossAction, Brain, Enemy } from "./enemy/components";
import type { Equipment, Inventory } from "./inventory/components";
import type {
  Container,
  ContainerAccess,
  ProximityContainer,
} from "./container/components";
import type { LootBag } from "./loot/components";
import { emptyLootRuntime, type LootRuntime } from "./loot/runtime";
import { createEvents, type Events } from "./events";
import type { OutboxMessage } from "./outbox";
import type { Input } from "./input/actions";
import type { AutoFire, MoveSpeed, PlayerControlled } from "./input/components";
import type { Projectile, Shooter, Team } from "./projectile/components";
import type { Animation, Facing, Rotation, Sprite } from "./sprite/components";
import type { FloatingText } from "./text/components";
import type { Tiles } from "./tiles";
import { STAT, type StatKind, type StatValue } from "./stats/components";

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
  autoFire: Store<AutoFire>;
  moveSpeed: Store<MoveSpeed>;
  sprite: Store<Sprite>;
  animation: Store<Animation>;
  facing: Store<Facing>;
  rotation: Store<Rotation>;
  projectile: Store<Projectile>;
  shooter: Store<Shooter>;
  team: Store<Team>;
  invulnerable: Store<Invulnerable>;
  character: Store<Character>;
  enemy: Store<Enemy>;
  brain: Store<Brain>;
  bossAction: Store<BossAction>;
  vulnerable: Store<Vulnerable>;
  // Who this entity is after, e.g. what an enemy aims at.
  target: Store<Entity>;
  floatingText: Store<FloatingText>;
  equipment: Store<Equipment>;
  inventory: Store<Inventory>;
  container: Store<Container>;
  proximityContainer: Store<ProximityContainer>;
  containerAccess: Store<ContainerAccess>;
  lootBag: Store<LootBag>;
  hazardExposure: Store<HazardExposure>;
} & Record<StatKind, Store<StatValue>>;

export type World = {
  nextEntity: Entity;
  components: Components;
  tiles: Tiles;
  input: Input;
  camera: Camera;
  events: Events;
  outbox: OutboxMessage[];
  loot: LootRuntime;
  // Random number in [0, 1), for anything random like damage rolls. Tests
  // swap it for a predictable one.
  random: () => number;
};

export type System = (world: World, dt: number) => void;

export function createWorld(
  tiles: Tiles,
  random: () => number = Math.random,
  loot: LootRuntime = emptyLootRuntime(),
): World {
  return {
    nextEntity: 0,
    tiles,
    input: { held: new Set(), commands: [] },
    camera: createCamera(),
    events: createEvents(),
    outbox: [],
    loot,
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
      autoFire: createStore(),
      moveSpeed: createStore(),
      sprite: createStore(),
      animation: createStore(),
      facing: createStore(),
      rotation: createStore(),
      projectile: createStore(),
      shooter: createStore(),
      team: createStore(),
      [STAT.HEALTH]: createStore(),
      [STAT.MANA]: createStore(),
      [STAT.ATTACK]: createStore(),
      [STAT.DEFENSE]: createStore(),
      [STAT.SPEED]: createStore(),
      [STAT.DEXTERITY]: createStore(),
      [STAT.VITALITY]: createStore(),
      [STAT.WISDOM]: createStore(),
      invulnerable: createStore(),
      character: createStore(),
      enemy: createStore(),
      brain: createStore(),
      bossAction: createStore(),
      vulnerable: createStore(),
      target: createStore(),
      floatingText: createStore(),
      equipment: createStore(),
      inventory: createStore(),
      container: createStore(),
      proximityContainer: createStore(),
      containerAccess: createStore(),
      lootBag: createStore(),
      hazardExposure: createStore(),
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
