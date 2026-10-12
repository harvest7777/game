import type { ContainerSlotRef, SlotRef } from "../inventory/components";
import type { ItemDef, ItemKind } from "../inventory/items";

// One-off requests from the player: hotkeys and the HUD both send these, and
// a system in the tick decides whether they happen. Unlike held actions they
// fire once per press or click.
export type Command =
  // Move an item between any two slots, swapping with what's there.
  | { kind: "move"; from: SlotRef; to: SlotRef }
  // Take from an open world container into the first empty inventory slot.
  | { kind: "take"; from: ContainerSlotRef }
  // Equip the item in inventory slot `index` (number keys, double-click).
  | { kind: "equip"; index: number }
  // Take off what's worn in `slot`, into the first empty inventory slot.
  | { kind: "unequip"; slot: ItemKind }
  // Start or stop the player's equipped weapon autofiring.
  | { kind: "toggleAutoFire" }
  // Debug/UI convenience: raise every current player stat to its cap.
  | { kind: "maxStats" }
  // Debug: add an item to the inventory.
  | { kind: "give"; item: ItemDef }
  // Go through the portal the player is standing on, if any.
  | { kind: "enterPortal" }
  // Head straight back to the nexus, from anywhere.
  | { kind: "returnToNexus" };

// Number keys equip the matching inventory slot, in every layout.
export const slotHotkeys: Record<string, Command> = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [
    `Digit${i + 1}`,
    { kind: "equip", index: i } satisfies Command,
  ]),
);

// One-off controls shared by every movement layout.
export const commandHotkeys: Record<string, Command> = {
  ...slotHotkeys,
  Tab: { kind: "toggleAutoFire" },
  Enter: { kind: "enterPortal" },
};
