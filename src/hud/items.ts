import type { Item } from "../ecs/inventory/components";
import type { ItemKind } from "../ecs/inventory/items";
import type { SpriteFile } from "../ecs/sprite/art";

// What the HUD needs to show about one item.
export type ItemView = { name: string; icon: SpriteFile };

export function itemView(item: Item | null): ItemView | null {
  if (!item) return null;
  return { name: item.def.name, icon: item.def.icon };
}

// How the HUD names each kind of item: in full in tooltips, and by a letter
// shown dimly in its empty equipment slot.
export const KIND_LABELS: Record<ItemKind, { name: string; letter: string }> = {
  weapon: { name: "Weapon", letter: "W" },
  ability: { name: "Ability", letter: "S" },
  armor: { name: "Armor", letter: "A" },
  ring: { name: "Ring", letter: "R" },
};
