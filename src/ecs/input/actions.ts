import type { Vec2 } from "../shared/physics/math";
import type { Command } from "./commands";

export const Action = {
  Up: "UP",
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
  Crouch: "CROUCH",
  RotateLeft: "ROTATE_LEFT",
  RotateRight: "ROTATE_RIGHT",
  Ability: "ABILITY",
  Shoot: "SHOOT",
} as const;

export type Action = (typeof Action)[keyof typeof Action];

// Maps KeyboardEvent.code to the action it triggers.
export type Keybinds = Record<string, Action>;

export const playerKeybinds: Keybinds = {
  KeyF: Action.Up,
  KeyR: Action.Left,
  KeyS: Action.Down,
  KeyT: Action.Right,
  KeyW: Action.RotateLeft,
  KeyP: Action.RotateRight,
  ShiftLeft: Action.Crouch,
  ShiftRight: Action.Crouch,
};

// The classic layout: WASD to move, Q/E to turn the camera.
export const wasdKeybinds: Keybinds = {
  KeyW: Action.Up,
  KeyA: Action.Left,
  KeyS: Action.Down,
  KeyD: Action.Right,
  KeyQ: Action.RotateLeft,
  KeyE: Action.RotateRight,
  ShiftLeft: Action.Crouch,
  ShiftRight: Action.Crouch,
};

// Layouts the player can switch between.
export const keybindPresets = {
  default: playerKeybinds,
  wasd: wasdKeybinds,
} satisfies Record<string, Keybinds>;

export type KeybindPreset = keyof typeof keybindPresets;

// What the player is asking for this tick, as actions rather than keys.
// `aim` is the world point under the cursor, once the cursor has been over
// the game. `commands` are this tick's one-off requests, in order.
export type Input = { held: Set<Action>; aim?: Vec2; commands: Command[] };

export function actionsFromKeys(
  keys: Iterable<string>,
  keybinds: Keybinds,
): Set<Action> {
  const actions = new Set<Action>();
  for (const key of keys) {
    if (key in keybinds) actions.add(keybinds[key]);
  }
  return actions;
}
