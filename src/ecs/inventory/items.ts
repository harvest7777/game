import type { WeaponId } from "../projectile/weapons";

// Which equipment slot an item goes in.
export type ItemKind = "weapon" | "ability" | "armor" | "ring";

// What a kind of item is. Like weapons and enemies, it's data: add an entry
// to add an item. `sprite` is its icon in the renderer's manifest.
export type ItemDef = {
  name: string;
  kind: ItemKind;
  sprite: string;
  // For weapons: what it fires.
  weapon?: WeaponId;
};

export const items = {
  apprenticeStaff: {
    name: "Apprentice Staff",
    kind: "weapon",
    sprite: "item.apprenticeStaff",
    weapon: "bolt",
  },
  hasteStaff: {
    name: "Staff of Haste",
    kind: "weapon",
    sprite: "item.hasteStaff",
    weapon: "fastBolt",
  },
  serpentStaff: {
    name: "Serpent Staff",
    kind: "weapon",
    sprite: "item.serpentStaff",
    weapon: "wavy",
  },
  currentStaff: {
    name: "Staff of Currents",
    kind: "weapon",
    sprite: "item.currentStaff",
    weapon: "tightWave",
  },
  cometStaff: {
    name: "Comet Staff",
    kind: "weapon",
    sprite: "item.cometStaff",
    weapon: "accelerating",
  },
  mireStaff: {
    name: "Mire Staff",
    kind: "weapon",
    sprite: "item.mireStaff",
    weapon: "slowing",
  },
  spiralStaff: {
    name: "Spiral Staff",
    kind: "weapon",
    sprite: "item.spiralStaff",
    weapon: "spiral",
  },
  phantomStaff: {
    name: "Phantom Staff",
    kind: "weapon",
    sprite: "item.phantomStaff",
    weapon: "ghost",
  },
  prejudiceStaff: {
    name: "Staff of Extreme Prejudice",
    kind: "weapon",
    sprite: "item.prejudiceStaff",
    weapon: "extremePrejudice",
  },
  boomerang: {
    name: "Wanderer's Boomerang",
    kind: "weapon",
    sprite: "item.boomerang",
    weapon: "boomerang",
  },
  lance: {
    name: "Piercing Lance",
    kind: "weapon",
    sprite: "item.lance",
    weapon: "lance",
  },
} satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof items;

export const itemIds = Object.keys(items) as ItemId[];

export function itemDef(id: ItemId): ItemDef {
  return items[id];
}
