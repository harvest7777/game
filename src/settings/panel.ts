import {
  keybindPresets,
  type KeybindPreset,
  type Keybinds,
} from "../ecs/input/actions";
import { commandHotkeys } from "../ecs/input/commands";
import {
  canBindHudKey,
  DEFAULT_HUD_KEYBINDS,
  restoreHudKeybinds,
  type HudAction,
  type HudKeybinds,
} from "../hud/hotkeys";

export type Settings = {
  // The movement layout's keys, for the game.
  keybinds(): Keybinds;
  // Keys for HUD-only actions, like toggling the inventory.
  hudKeybinds(): HudKeybinds;
};

// Wires up the overlay's settings: the controls layout and rebindable HUD
// keys, each remembered in the browser. `controlsChanged` runs when the
// layout switches, so keys held in the old one can be let go.
export function installSettings(controlsChanged: () => void): Settings {
  const picker = document.getElementById(
    "settingsControls",
  ) as HTMLSelectElement;
  let preset: KeybindPreset = "default";
  const savedPreset = load("controls");
  if (savedPreset && savedPreset in keybindPresets) {
    preset = savedPreset as KeybindPreset;
    picker.value = preset;
  }
  let hudKeybinds = restoreHudKeybinds(parse(load("hudKeybinds")));

  // The keys the game already uses in the current layout, which HUD keys
  // can't take.
  const gameKeys = () => [
    ...Object.keys(keybindPresets[preset]),
    ...Object.keys(commandHotkeys),
  ];

  const inventoryKey = rebindButton("settingsInventoryKey", "toggleInventory");

  picker.addEventListener("change", () => {
    preset = picker.value as KeybindPreset;
    save("controls", preset);
    // A HUD key the new layout uses goes back to its default.
    for (const action of Object.keys(hudKeybinds) as HudAction[]) {
      if (
        !canBindHudKey(hudKeybinds, action, hudKeybinds[action], gameKeys())
      ) {
        hudKeybinds = {
          ...hudKeybinds,
          [action]: DEFAULT_HUD_KEYBINDS[action],
        };
      }
    }
    save("hudKeybinds", JSON.stringify(hudKeybinds));
    inventoryKey.show();
    controlsChanged();
    picker.blur();
  });

  // A button showing an action's key. Click it, then press a key to bind;
  // Escape cancels, and a key that's taken is refused.
  function rebindButton(id: string, action: HudAction) {
    const button = document.getElementById(id) as HTMLButtonElement;
    const show = (note = "") =>
      (button.textContent = keyName(hudKeybinds[action]) + note);
    show();
    button.addEventListener("click", () => {
      button.textContent = "press a key";
      const capture = (event: KeyboardEvent) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.code === "Escape") return finish();
        if (!canBindHudKey(hudKeybinds, action, event.code, gameKeys())) {
          button.textContent = `${keyName(event.code)} is taken, try another`;
          return;
        }
        hudKeybinds = { ...hudKeybinds, [action]: event.code };
        save("hudKeybinds", JSON.stringify(hudKeybinds));
        finish();
      };
      const finish = () => {
        window.removeEventListener("keydown", capture, true);
        show();
        button.blur();
      };
      window.addEventListener("keydown", capture, true);
    });
    return { show };
  }

  return {
    keybinds: () => keybindPresets[preset],
    hudKeybinds: () => hudKeybinds,
  };
}

// "KeyG" reads as "G", "Digit1" as "1"; anything else as its code.
function keyName(code: string): string {
  return code.replace(/^Key|^Digit/, "");
}

// Storage can be unavailable (private windows); then nothing is
// remembered, but everything still works.
function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered, but still applied.
  }
}

function parse(json: string | null): unknown {
  try {
    return JSON.parse(json ?? "null");
  } catch {
    return null;
  }
}
