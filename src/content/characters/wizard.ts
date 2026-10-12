import type { CharacterDef } from "../../ecs/character/definitions";
import type { SpriteFile, WalkerArt } from "../../ecs/sprite/art";
import { apprenticeStaff } from "../items/apprenticeStaff";
import { STAT, stat } from "../../ecs/stats/components";

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
  stats: {
    [STAT.HEALTH]: stat(700),
    [STAT.MANA]: stat(100),
    [STAT.ATTACK]: stat(25, 75),
    [STAT.DEFENSE]: stat(0, 25),
    [STAT.SPEED]: stat(25, 75),
    [STAT.DEXTERITY]: stat(25, 75),
    [STAT.VITALITY]: stat(10, 75),
    [STAT.WISDOM]: stat(25, 75),
  },
  startingWeapon: apprenticeStaff,
  gravestone: { kind: "static", file: "characters/gravestone" },
};
