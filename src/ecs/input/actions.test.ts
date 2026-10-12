import { describe, expect, it } from "vitest";
import {
  Action,
  actionsFromKeys,
  keybindPresets,
  layoutHotkeys,
  wasdKeybinds,
  type KeybindPreset,
  type Keybinds,
} from "./actions";
import { commandHotkeys } from "./commands";

describe("actionsFromKeys", () => {
  const keybinds: Keybinds = { KeyW: Action.Up, KeyD: Action.Right };

  it("maps each bound key to its action", () => {
    const actions = actionsFromKeys(["KeyW", "KeyD"], keybinds);

    expect(actions).toEqual(new Set([Action.Up, Action.Right]));
  });

  it("ignores unbound keys", () => {
    const actions = actionsFromKeys(["KeyW", "KeyQ"], keybinds);

    expect(actions).toEqual(new Set([Action.Up]));
  });
});

describe("keybind presets", () => {
  it("maps WASD to moving and Q/E to turning", () => {
    expect(
      actionsFromKeys(["KeyW", "KeyA", "KeyS", "KeyD"], wasdKeybinds),
    ).toEqual(new Set([Action.Up, Action.Left, Action.Down, Action.Right]));
    expect(actionsFromKeys(["KeyQ"], wasdKeybinds)).toEqual(
      new Set([Action.RotateLeft]),
    );
    expect(actionsFromKeys(["KeyE"], wasdKeybinds)).toEqual(
      new Set([Action.RotateRight]),
    );
  });

  it("all cover moving, turning and crouching", () => {
    const needed = [
      Action.Up,
      Action.Down,
      Action.Left,
      Action.Right,
      Action.RotateLeft,
      Action.RotateRight,
      Action.Crouch,
    ];
    for (const [name, binds] of Object.entries(keybindPresets)) {
      const bound = new Set(Object.values(binds));
      for (const action of needed)
        expect(bound.has(action), `${name} ${action}`).toBe(true);
    }
  });
});

describe("command hotkeys", () => {
  it("maps Tab to toggling autofire", () => {
    expect(commandHotkeys.Tab).toEqual({ kind: "toggleAutoFire" });
  });
});

describe("layoutHotkeys", () => {
  it("never puts a command on a key the layout moves or turns with", () => {
    for (const preset of Object.keys(keybindPresets) as KeybindPreset[]) {
      for (const key of Object.keys(layoutHotkeys[preset])) {
        expect(keybindPresets[preset], `${preset} ${key}`).not.toHaveProperty(
          key,
        );
        expect(commandHotkeys, `${preset} ${key}`).not.toHaveProperty(key);
      }
    }
  });

  it("goes back to the nexus on B in the default layout and R with WASD", () => {
    expect(layoutHotkeys.default.KeyB).toEqual({ kind: "returnToNexus" });
    expect(layoutHotkeys.wasd.KeyR).toEqual({ kind: "returnToNexus" });
  });
});
