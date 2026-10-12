import { describe, expect, it } from "vitest";
import {
  Action,
  actionsFromKeys,
  keybindPresets,
  wasdKeybinds,
  type Keybinds,
} from "./actions";

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
