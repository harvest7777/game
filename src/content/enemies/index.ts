import type { EnemyDef } from "../../ecs/enemy/definitions";
import { dummy } from "./dummy";
import { slime } from "./slime";
import { archer } from "./archer";
import { boar } from "./boar";
import { slimeKing } from "./slimeKing";
import { imp } from "./imp";
import { demon } from "./demon";
import { demonWarrior } from "./demonWarrior";
import { demonMage } from "./demonMage";
import { brute } from "./brute";
import { bruteWarrior } from "./bruteWarrior";
import { malphasFlamer } from "./malphasFlamer";
import { malphasProtector } from "./malphasProtector";
import { malphas } from "./malphas";

// Every kind of enemy, by id.
export const enemies = {
  dummy,
  slime,
  archer,
  boar,
  slimeKing,
  imp,
  demon,
  demonWarrior,
  demonMage,
  brute,
  bruteWarrior,
  malphasFlamer,
  malphasProtector,
  malphas,
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof enemies;

export const enemyIds = Object.keys(enemies) as EnemyId[];
