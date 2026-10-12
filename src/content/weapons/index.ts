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
import { impShot } from "./impShot";
import { demonVolley } from "./demonVolley";
import { demonSlash } from "./demonSlash";
import { mageRing } from "./mageRing";
import { bruteShotgun } from "./bruteShotgun";
import { bruteRing } from "./bruteRing";
import { protectorPinwheel } from "./protectorPinwheel";
import { flamerBreath } from "./flamerBreath";
import { malphasRing } from "./malphasRing";
import { malphasVolley } from "./malphasVolley";
import { malphasShockwave } from "./malphasShockwave";
import { malphasFrenzy } from "./malphasFrenzy";
import { demonfireStaff } from "./demonfireStaff";

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
  impShot,
  demonVolley,
  demonSlash,
  mageRing,
  bruteShotgun,
  bruteRing,
  protectorPinwheel,
  flamerBreath,
  malphasRing,
  malphasVolley,
  malphasShockwave,
  malphasFrenzy,
  demonfireStaff,
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof weapons;

export const weaponIds = Object.keys(weapons) as WeaponId[];
