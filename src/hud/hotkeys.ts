import type { HudState } from "./state";

// Keys that only change the HUD, never the game, so they never reach the
// simulation. Each is bound to one KeyboardEvent.code and can be rebound.
export type HudAction = "toggleInventory";

export type HudKeybinds = Record<HudAction, string>;

export const DEFAULT_HUD_KEYBINDS: HudKeybinds = { toggleInventory: "KeyG" };

// What each action does to the HUD.
const HUD_ACTIONS: Record<HudAction, (state: HudState) => void> = {
  toggleInventory: (state) => {
    state.inventoryOpen = !state.inventoryOpen;
    if (state.inventoryOpen) return;
    // Nothing hidden stays hovered or held.
    if (state.hover?.in === "inventory") state.hover = undefined;
    if (state.press?.item?.in === "inventory") state.press = undefined;
  },
};

// Applies whatever HUD action `code` is bound to. Returns whether there was
// one, so the key isn't also used for anything else.
export function hudHotkey(
  state: HudState,
  binds: HudKeybinds,
  code: string,
): boolean {
  const action = (Object.keys(binds) as HudAction[]).find(
    (a) => binds[a] === code,
  );
  if (!action) return false;
  HUD_ACTIONS[action](state);
  return true;
}

// Whether `code` is free for `action`: not one of the game's keys
// (`gameKeys`) and not bound to another HUD action.
export function canBindHudKey(
  binds: HudKeybinds,
  action: HudAction,
  code: string,
  gameKeys: Iterable<string>,
): boolean {
  if ([...gameKeys].includes(code)) return false;
  return (Object.keys(binds) as HudAction[]).every(
    (other) => other === action || binds[other] !== code,
  );
}

// HUD keybinds from saved data, falling back to the defaults for anything
// missing or broken.
export function restoreHudKeybinds(saved: unknown): HudKeybinds {
  const binds = { ...DEFAULT_HUD_KEYBINDS };
  if (typeof saved !== "object" || saved === null) return binds;
  for (const action of Object.keys(binds) as HudAction[]) {
    const code = (saved as Record<string, unknown>)[action];
    if (typeof code === "string" && code.length > 0) binds[action] = code;
  }
  return binds;
}
