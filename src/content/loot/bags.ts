import { ITEM_CATEGORIES, itemTier } from "../../ecs/inventory/items";
import {
  defineLootBag,
  itemQuery,
  type LootBagDef,
} from "../../ecs/loot/definitions";
import type { Outline } from "../../ecs/sprite/components";
import { SPECIAL, STAT_POTION } from "../items/loot";

const CAPACITY = 8;
const LIFETIME = 60;
const EXPIRY_FLASH = {
  duration: 10,
  startFrequency: 1,
  endFrequency: 7,
} as const;
const OUTLINE: Outline = { color: [0, 0, 0, 1] };
const CURRENT_LOW_TIER_MAX = itemTier(8);

export const brownBag = defineLootBag({
  name: "Brown Bag",
  art: { kind: "static", file: "loot/brownBag" },
  outline: OUTLINE,
  priority: 20,
  capacity: CAPACITY,
  lifetime: LIFETIME,
  expiryFlash: EXPIRY_FLASH,
  matches: [
    itemQuery({ categories: [ITEM_CATEGORIES.CONSUMABLE] }),
    itemQuery({
      tier: { min: itemTier(0), max: CURRENT_LOW_TIER_MAX },
    }),
  ],
});

export const tieredBag = defineLootBag({
  name: "Tiered Bag",
  art: { kind: "static", file: "loot/tieredBag" },
  outline: OUTLINE,
  priority: 10,
  capacity: CAPACITY,
  lifetime: LIFETIME,
  expiryFlash: EXPIRY_FLASH,
  matches: itemQuery({ tiered: true }),
});

export const statPotionBag = defineLootBag({
  name: "Stat Potion Bag",
  art: { kind: "static", file: "loot/statPotionBag" },
  outline: OUTLINE,
  priority: 30,
  capacity: CAPACITY,
  lifetime: LIFETIME,
  expiryFlash: EXPIRY_FLASH,
  matches: itemQuery({ tags: [STAT_POTION] }),
});

export const specialBag = defineLootBag({
  name: "Special Bag",
  art: { kind: "static", file: "loot/specialBag" },
  outline: OUTLINE,
  priority: 100,
  capacity: CAPACITY,
  lifetime: LIFETIME,
  expiryFlash: EXPIRY_FLASH,
  matches: itemQuery({ tags: [SPECIAL] }),
});

export const lootBags = [
  brownBag,
  tieredBag,
  statPotionBag,
  specialBag,
] satisfies readonly LootBagDef[];
