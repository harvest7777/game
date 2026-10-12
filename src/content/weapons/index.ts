import type { WeaponDef } from "../../ecs/projectile/weapons";
import { singleBolt } from "./singleBolt";
import { singleFastBolt } from "./singleFastBolt";
import { singleWavy } from "./singleWavy";
import { singleTightWave } from "./singleTightWave";
import { singleAccelerating } from "./singleAccelerating";
import { singleSlowing } from "./singleSlowing";
import { singleSpiral } from "./singleSpiral";
import { singleGhost } from "./singleGhost";
import { singleBoomerang } from "./singleBoomerang";
import { singleLance } from "./singleLance";
import { extremePrejudice } from "./extremePrejudice";
import { slimeSpit } from "./slimeSpit";
import { archerVolley } from "./archerVolley";
import { kingSpray } from "./kingSpray";
import { kingRing } from "./kingRing";
import { kingFrenzy } from "./kingFrenzy";
import { twinHelix } from "./twinHelix";
import { leafVolley } from "./leafVolley";
import { forkedNeedles } from "./forkedNeedles";
import { bloom } from "./bloom";

// Every weapon, by id.
export const weapons = {
  singleBolt,
  singleFastBolt,
  singleWavy,
  singleTightWave,
  singleAccelerating,
  singleSlowing,
  singleSpiral,
  singleGhost,
  singleBoomerang,
  singleLance,
  extremePrejudice,
  slimeSpit,
  archerVolley,
  kingSpray,
  kingRing,
  kingFrenzy,
  twinHelix,
  leafVolley,
  forkedNeedles,
  bloom,
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof weapons;

export const weaponIds = Object.keys(weapons) as WeaponId[];
