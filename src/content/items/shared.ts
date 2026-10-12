import {
  ITEM_CATEGORIES,
  ITEM_KIND,
  type EquipmentItemDef,
} from "../../ecs/inventory/items";

type WeaponItemFields = Omit<EquipmentItemDef, "category" | "kind">;

export function defineWeaponItem(fields: WeaponItemFields): EquipmentItemDef {
  return {
    category: ITEM_CATEGORIES.EQUIPMENT,
    kind: ITEM_KIND.WEAPON,
    ...fields,
  };
}
