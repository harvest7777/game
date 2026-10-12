import type { EquipmentItemDef, ItemKind } from "../inventory/items";
import type { Hitbox } from "../movement/components";
import type { SpriteArt } from "../sprite/art";
import type { Sprite } from "../sprite/components";
import type { CompleteStatBlock } from "../stats/components";

// What a playable character is: a class to pick from the character list.
// Each is its own file under src/content/characters. Fields reuse the
// component types they end up in.
export type CharacterDef = {
  name: string;
  sprite: Pick<Sprite, "art" | "outline" | "scale">;
  hitbox: Hitbox;
  // Starting resources, attributes and class caps.
  stats: CompleteStatBlock;
  // Worn from the start, by equipment slot.
  startingEquipment?: Partial<Record<ItemKind, EquipmentItemDef>>;
  // Left where it dies.
  gravestone: SpriteArt;
};
