import { describe, expect, it } from "vitest";
import { Action, actionsFromKeys, type Keybinds } from "./actions";

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
