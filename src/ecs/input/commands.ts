import type { SlotRef } from "../inventory/components";
import type { ItemId } from "../inventory/items";

// One-off requests from the player: hotkeys and the HUD both send these, and
// a system in the tick decides whether they happen. Unlike held actions they
// fire once per press or click.
export type Command =
  // Move an item between any two slots, swapping with what's there.
  | { kind: "move"; from: SlotRef; to: SlotRef }
  // Equip the item in inventory slot `index` (number keys, double-click).
  | { kind: "equip"; index: number }
  // Debug: add an item to the inventory.
  | { kind: "give"; item: ItemId };

// Number keys equip the matching inventory slot, in every layout.
export const slotHotkeys: Record<string, Command> = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [
    `Digit${i + 1}`,
    { kind: "equip", index: i } satisfies Command,
  ]),
);
