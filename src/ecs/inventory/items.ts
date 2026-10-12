import type { WeaponDef } from "../projectile/weapons";
import type { SpriteFile } from "../sprite/art";

// Every kind of item, in the order their equipment slots are shown. Each
// kind has one equipment slot.
export const ITEM_KINDS = ["weapon", "ability", "armor", "ring"] as const;

// Which equipment slot an item goes in.
export type ItemKind = (typeof ITEM_KINDS)[number];

// What a kind of item is. Each item is its own file under
// src/content/items.
export type ItemDef = {
  name: string;
  kind: ItemKind;
  // The art the HUD shows it with.
  icon: SpriteFile;
  // For weapons: what it fires.
  weapon?: WeaponDef;
};
