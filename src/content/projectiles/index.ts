import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { bolt } from "./bolt";
import { fastBolt } from "./fastBolt";
import { wavy } from "./wavy";
import { tightWave } from "./tightWave";
import { accelerating } from "./accelerating";
import { slowing } from "./slowing";
import { spiral } from "./spiral";
import { boomerang } from "./boomerang";
import { ghost } from "./ghost";
import { prejudice } from "./prejudice";
import { slimeBall } from "./slimeBall";
import { arrow } from "./arrow";
import { lance } from "./lance";
import { helix } from "./helix";
import { leafVein } from "./leafVein";
import { leafEdge } from "./leafEdge";
import { needle } from "./needle";
import { petal } from "./petal";
import { bud } from "./bud";
import { impFire } from "./impFire";
import { demonFireball } from "./demonFireball";
import { demonBlade } from "./demonBlade";
import { mageOrb } from "./mageOrb";
import { bruteShot } from "./bruteShot";
import { protectorFlame } from "./protectorFlame";
import { flamerFlame } from "./flamerFlame";
import { malphasFlame } from "./malphasFlame";
import { malphasLance } from "./malphasLance";
import { malphasShock } from "./malphasShock";
import { malphasCurl } from "./malphasCurl";
import { demonfire } from "./demonfire";

// Every kind of projectile, by id.
export const projectiles = {
  bolt,
  fastBolt,
  wavy,
  tightWave,
  accelerating,
  slowing,
  spiral,
  boomerang,
  ghost,
  prejudice,
  slimeBall,
  arrow,
  lance,
  helix,
  leafVein,
  leafEdge,
  needle,
  petal,
  bud,
  impFire,
  demonFireball,
  demonBlade,
  mageOrb,
  bruteShot,
  protectorFlame,
  flamerFlame,
  malphasFlame,
  malphasLance,
  malphasShock,
  malphasCurl,
  demonfire,
} satisfies Record<string, ProjectileDef>;

export type ProjectileId = keyof typeof projectiles;

export const projectileIds = Object.keys(projectiles) as ProjectileId[];
