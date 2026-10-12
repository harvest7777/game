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

// What the player is asking for this tick, as actions rather than keys.
export type Input = { held: Set<Action> };

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
