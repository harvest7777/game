import type {
  ItemCategory,
  ItemDef,
  ItemKind,
  ItemTagDef,
  ItemTier,
} from "../inventory/items";
import type { SpriteArt } from "../sprite/art";
import type { Outline } from "../sprite/components";

export type ItemQuery = Readonly<{
  categories?: readonly ItemCategory[];
  kinds?: readonly ItemKind[];
  tiered?: true;
  tier?: Readonly<{ min: ItemTier; max: ItemTier }>;
  tags?: readonly ItemTagDef[];
}>;

export function itemQuery(query: ItemQuery): ItemQuery {
  return query;
}

// One query, or several queries of which any may match. Bag definitions use
// this to combine categories and tier bands without item ids or string tags.
export type ItemMatcher = ItemQuery | readonly ItemQuery[];

export const LOOT_SOURCE_KINDS = {
  EXACT: "exact",
  QUERY: "query",
  WEIGHTED: "weighted",
} as const;

export const LOOT_SELECTIONS = {
  ITEM: "item",
  EQUIPMENT_KIND_THEN_ITEM: "equipmentKindThenItem",
} as const;

type ExactSource = Readonly<{
  kind: typeof LOOT_SOURCE_KINDS.EXACT;
  items: readonly ItemDef[];
}>;

type QuerySource = Readonly<{
  kind: typeof LOOT_SOURCE_KINDS.QUERY;
  query: ItemQuery;
  selection: (typeof LOOT_SELECTIONS)[keyof typeof LOOT_SELECTIONS];
}>;

export type WeightedLootOption = Readonly<{
  weight: number;
  source: LootSource;
}>;

type WeightedSource = Readonly<{
  kind: typeof LOOT_SOURCE_KINDS.WEIGHTED;
  options: readonly WeightedLootOption[];
}>;

export type LootSource = ExactSource | QuerySource | WeightedSource;

export function exactItem(...items: ItemDef[]): LootSource {
  return { kind: LOOT_SOURCE_KINDS.EXACT, items };
}

export function anyItem(query: ItemQuery): LootSource {
  return {
    kind: LOOT_SOURCE_KINDS.QUERY,
    query,
    selection: LOOT_SELECTIONS.ITEM,
  };
}

export function anyTieredEquipment(
  min: ItemTier,
  max: ItemTier,
  kinds?: readonly ItemKind[],
): LootSource {
  return {
    kind: LOOT_SOURCE_KINDS.QUERY,
    query: itemQuery({ tier: { min, max }, ...(kinds && { kinds }) }),
    selection: LOOT_SELECTIONS.EQUIPMENT_KIND_THEN_ITEM,
  };
}

export function weightedOption(
  weight: number,
  source: LootSource,
): WeightedLootOption {
  return { weight, source };
}

export function weightedChoice(...options: WeightedLootOption[]): LootSource {
  return { kind: LOOT_SOURCE_KINDS.WEIGHTED, options };
}

export type LootRule = Readonly<{
  chance: number;
  rolls: number;
  source: LootSource;
}>;

export function drop(
  source: LootSource,
  options: Readonly<{ chance?: number; rolls?: number }> = {},
): LootRule {
  return {
    source,
    chance: options.chance ?? 1,
    rolls: options.rolls ?? 1,
  };
}

export type LootTableDef = Readonly<{ rules: readonly LootRule[] }>;

export function lootTable(...rules: LootRule[]): LootTableDef {
  return { rules };
}

export type LootBagDef = Readonly<{
  name: string;
  art: SpriteArt;
  outline?: Outline;
  priority: number;
  capacity: number;
  lifetime: number;
  expiryFlash?: Readonly<{
    duration: number;
    startFrequency: number;
    endFrequency: number;
  }>;
  matches: ItemMatcher;
}>;

export function defineLootBag(def: LootBagDef): LootBagDef {
  return def;
}
