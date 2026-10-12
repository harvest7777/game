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

export type CameraAction = Extract<Action, "ROTATE_LEFT" | "ROTATE_RIGHT">;

export type Keybinds = Record<string, Action>;

export const playerKeybinds: Keybinds = {
  KeyF: Action.Up,
  KeyR: Action.Left,
  KeyS: Action.Down,
  KeyT: Action.Right,
  KeyW: Action.RotateLeft,
  KeyP: Action.RotateRight,
};
