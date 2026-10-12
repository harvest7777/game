import type { CharacterDef } from "../../ecs/character/definitions";
import type { SpriteFile, WalkerArt } from "../../ecs/sprite/art";
import { apprenticeStaff } from "../items/apprenticeStaff";

function frames(facing: string): SpriteFile[] {
  return [0, 1, 2].map((frame) => `player/${facing}-${frame}`);
}

// Walks in every direction, thrusting a staff while shooting.
export const wizardArt: WalkerArt = {
  kind: "walker",
  front: frames("front"),
  back: frames("back"),
  side: frames("side"),
  attack: {
    front: frames("front-attack"),
    back: frames("back-attack"),
    side: frames("side-attack"),
  },
};

// Casts bolts from a staff.
export const wizard: CharacterDef = {
  name: "Wizard",
  sprite: { art: wizardArt, outline: { color: [0, 0, 0, 1] } },
  hitbox: { r: 0.4 },
  health: 500,
  speed: 5,
  startingWeapon: apprenticeStaff,
};
