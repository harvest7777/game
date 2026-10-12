import type { Entity, World } from "../world";
import { isEquipmentItem } from "../inventory/items";
import {
  RESOURCE_STATS,
  STAT,
  STAT_KINDS,
  type ResourceStatKind,
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

export function equipmentBonus(
  world: World,
  entity: Entity,
  kind: StatKind,
): number {
  const equipment = world.components.equipment.get(entity);
  if (!equipment) return 0;
  let total = 0;
  for (const item of Object.values(equipment)) {
    if (item && isEquipmentItem(item.def)) {
      total += item.def.bonuses[kind] ?? 0;
    }
  }
  return total;
}

// The gameplay value after equipment. For resources this is the amount left;
// their bonus applies to capacity instead (see effectiveResourceMax).
export function effectiveStatNumber(
  world: World,
  entity: Entity,
  kind: StatKind,
): number | undefined {
  const stat = statOf(world, entity, kind);
  if (!stat) return undefined;
  return RESOURCE_STATS.includes(kind as ResourceStatKind)
    ? stat.value
    : stat.value + equipmentBonus(world, entity, kind);
}

export function effectiveResourceMax(
  world: World,
  entity: Entity,
  kind: ResourceStatKind,
): number | undefined {
  const stat = statOf(world, entity, kind);
  return stat && stat.max + equipmentBonus(world, entity, kind);
}

// A presentation-ready stat: effective value for attributes, effective max
// for resources, while the stored component remains the base stat.
export function effectiveStatOf(
  world: World,
  entity: Entity,
  kind: StatKind,
): StatValue | undefined {
  const stat = statOf(world, entity, kind);
  if (!stat) return undefined;
  if (RESOURCE_STATS.includes(kind as ResourceStatKind)) {
    return {
      value: stat.value,
      max: effectiveResourceMax(world, entity, kind as ResourceStatKind)!,
    };
  }
  return {
    value: stat.value + equipmentBonus(world, entity, kind),
    max: stat.max,
  };
}

export function clampResources(world: World, entity: Entity): void {
  for (const kind of RESOURCE_STATS) {
    const stat = statOf(world, entity, kind);
    const max = effectiveResourceMax(world, entity, kind);
    if (stat && max !== undefined) stat.value = Math.min(stat.value, max);
  }
}

export function fillResources(world: World, entity: Entity): void {
  for (const kind of RESOURCE_STATS) {
    const stat = statOf(world, entity, kind);
    const max = effectiveResourceMax(world, entity, kind);
    if (stat && max !== undefined) stat.value = max;
  }
}

export function addStats(world: World, entity: Entity, stats: StatBlock): void {
  for (const kind of STAT_KINDS) {
    const value = stats[kind];
    if (value) world.components[kind].set(entity, { ...value });
  }
}

export function movementSpeed(world: World, entity: Entity): number {
  const speed = effectiveStatNumber(world, entity, STAT.SPEED);
  return speed === undefined
    ? (world.components.moveSpeed.get(entity) ?? 0)
    : tilesPerSecond(speed);
}

export function damageMultiplier(world: World, entity: Entity): number {
  return attackMultiplier(effectiveStatNumber(world, entity, STAT.ATTACK));
}

export function shotsPerSecond(world: World, entity: Entity, rate: number) {
  return (
    rate *
    fireRateMultiplier(effectiveStatNumber(world, entity, STAT.DEXTERITY))
  );
}
