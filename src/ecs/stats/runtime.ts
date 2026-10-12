import type { Entity, World } from "../world";
import {
  STAT,
  STAT_KINDS,
  type StatBlock,
  type StatKind,
  type StatValue,
} from "./components";
import {
  attackMultiplier,
  fireRateMultiplier,
  tilesPerSecond,
} from "./formulas";

export function statOf(
  world: World,
  entity: Entity,
  kind: StatKind,
): StatValue | undefined {
  return world.components[kind].get(entity);
}

export function statNumber(
  world: World,
  entity: Entity,
  kind: StatKind,
): number | undefined {
  return statOf(world, entity, kind)?.value;
}

export function addStats(world: World, entity: Entity, stats: StatBlock): void {
  for (const kind of STAT_KINDS) {
    const value = stats[kind];
    if (value) world.components[kind].set(entity, { ...value });
  }
}

export function movementSpeed(world: World, entity: Entity): number {
  const speed = statNumber(world, entity, STAT.SPEED);
  return speed === undefined
    ? (world.components.moveSpeed.get(entity) ?? 0)
    : tilesPerSecond(speed);
}

export function damageMultiplier(world: World, entity: Entity): number {
  return attackMultiplier(statNumber(world, entity, STAT.ATTACK));
}

export function shotsPerSecond(world: World, entity: Entity, rate: number) {
  return rate * fireRateMultiplier(statNumber(world, entity, STAT.DEXTERITY));
}
