import type { WeaponDef } from "../projectile/weapons";
import type { SpriteFile } from "../sprite/art";

// Every kind of item, in the order their equipment slots are shown. Each
// kind has one equipment slot.
export const ITEM_KINDS = ["weapon", "ability", "armor", "ring"] as const;

export const ITEM_KIND = {
  WEAPON: ITEM_KINDS[0],
  ABILITY: ITEM_KINDS[1],
  ARMOR: ITEM_KINDS[2],
  RING: ITEM_KINDS[3],
} as const;

// Which equipment slot an item goes in.
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_CATEGORIES = {
  EQUIPMENT: "equipment",
  CONSUMABLE: "consumable",
} as const;

export type ItemCategory =
  (typeof ITEM_CATEGORIES)[keyof typeof ITEM_CATEGORIES];

declare const ITEM_TIER: unique symbol;
export type ItemTier = number & { readonly [ITEM_TIER]: true };

export function itemTier(value: number): ItemTier {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`item tier must be a non-negative integer, got ${value}`);
  }
  return value as ItemTier;
}

declare const ITEM_TAG: unique symbol;
export type ItemTagDef = Readonly<{
  name: string;
  readonly [ITEM_TAG]: true;
}>;

export function defineItemTag(name: string): ItemTagDef {
  return Object.freeze({ name }) as ItemTagDef;
}

export type ItemLootProfile = Readonly<{
  tier?: ItemTier;
  tags: readonly ItemTagDef[];
}>;

type BaseItemDef = {
  name: string;
  icon: SpriteFile;
  loot: ItemLootProfile;
};

export type EquipmentItemDef = BaseItemDef & {
  category: typeof ITEM_CATEGORIES.EQUIPMENT;
  kind: ItemKind;
  weapon?: WeaponDef;
};

export type ConsumableItemDef = BaseItemDef & {
  category: typeof ITEM_CATEGORIES.CONSUMABLE;
};

// What a kind of item is. Each item is its own file under src/content/items.
// Equipment has a slot; consumables live only in general-purpose containers.
export type ItemDef = EquipmentItemDef | ConsumableItemDef;

export function isEquipmentItem(item: ItemDef): item is EquipmentItemDef {
  return item.category === ITEM_CATEGORIES.EQUIPMENT;
}
