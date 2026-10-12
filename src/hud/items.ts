import type { Item } from "../ecs/inventory/components";
import { itemDef, type ItemId } from "../ecs/inventory/items";

// What the HUD needs to show about one item.
export type ItemView = { id: ItemId; name: string; sprite: string };

export function itemView(item: Item | null): ItemView | null {
  if (!item) return null;
  const def = itemDef(item.def);
  return { id: item.def, name: def.name, sprite: def.sprite };
}
