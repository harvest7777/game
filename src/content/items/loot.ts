import {
  defineItemTag,
  itemTier,
  type ItemLootProfile,
} from "../../ecs/inventory/items";

export const SPECIAL = defineItemTag("Special");
export const STAT_POTION = defineItemTag("Stat potion");

export function tiered(tier: number): ItemLootProfile {
  return { tier: itemTier(tier), tags: [] };
}

export const special: ItemLootProfile = { tags: [SPECIAL] };
