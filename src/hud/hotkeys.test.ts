import { describe, expect, it } from "vitest";
import {
  canBindHudKey,
  DEFAULT_HUD_KEYBINDS,
  hudHotkey,
  restoreHudKeybinds,
} from "./hotkeys";
import { createHudState } from "./state";

describe("hudHotkey", () => {
  it("toggles the inventory with its key", () => {
    const state = createHudState();
    expect(hudHotkey(state, DEFAULT_HUD_KEYBINDS, "KeyG")).toBe(true);
    expect(state.inventoryOpen).toBe(false);
    hudHotkey(state, DEFAULT_HUD_KEYBINDS, "KeyG");
    expect(state.inventoryOpen).toBe(true);
  });

  it("lets go of inventory slots when hiding it", () => {
    const state = createHudState();
    const slot = { in: "inventory", index: 0 } as const;
    state.hover = slot;
    state.press = { at: { x: 0, y: 0 }, dragging: true, item: slot };

    hudHotkey(state, DEFAULT_HUD_KEYBINDS, "KeyG");

    expect(state.hover).toBeUndefined();
    expect(state.press).toBeUndefined();
  });

  it("ignores keys bound to nothing", () => {
    const state = createHudState();
    expect(hudHotkey(state, DEFAULT_HUD_KEYBINDS, "KeyZ")).toBe(false);
    expect(state.inventoryOpen).toBe(true);
  });
});

describe("canBindHudKey", () => {
  it("refuses the game's keys", () => {
    const game = ["KeyW", "Digit1", "Tab"];
    const can = (code: string) =>
      canBindHudKey(DEFAULT_HUD_KEYBINDS, "toggleInventory", code, game);
    expect(can("KeyI")).toBe(true);
    expect(can("KeyW")).toBe(false);
    expect(can("Digit1")).toBe(false);
  });

  it("allows rebinding an action to its own key", () => {
    expect(
      canBindHudKey(DEFAULT_HUD_KEYBINDS, "toggleInventory", "KeyG", []),
    ).toBe(true);
  });
});

describe("restoreHudKeybinds", () => {
  it("keeps saved keys and defaults the rest", () => {
    expect(restoreHudKeybinds({ toggleInventory: "KeyI" })).toEqual({
      toggleInventory: "KeyI",
    });
    expect(restoreHudKeybinds(null)).toEqual(DEFAULT_HUD_KEYBINDS);
    expect(restoreHudKeybinds({ toggleInventory: 7 })).toEqual(
      DEFAULT_HUD_KEYBINDS,
    );
  });
});
