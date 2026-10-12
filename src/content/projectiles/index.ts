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
} satisfies Record<string, ProjectileDef>;

export type ProjectileId = keyof typeof projectiles;

export const projectileIds = Object.keys(projectiles) as ProjectileId[];
