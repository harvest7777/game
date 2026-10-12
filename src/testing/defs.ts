import type { CharacterDef } from "../ecs/character/definitions";
import type { EnemyDef } from "../ecs/enemy/definitions";
import type { BossSequence } from "../ecs/enemy/sequences";
import {
  ITEM_CATEGORIES,
  ITEM_KIND,
  itemTier,
  type ConsumableItemDef,
  type EquipmentItemDef,
} from "../ecs/inventory/items";
import type { ProjectileDef } from "../ecs/projectile/definitions";
import { ring, spread, type WeaponDef } from "../ecs/projectile/weapons";
import { STAT, stat } from "../ecs/stats/components";

// Small stand-in definitions for engine tests, so retuning game content never
// breaks them. Each takes only the fields a test cares about; the rest are
// plain defaults.

// 10 tiles/s for 1 s, 10 damage, a 0.15-tile hitbox, flying straight.
export function testProjectile(
  changes: Partial<ProjectileDef> = {},
): ProjectileDef {
  return {
    speed: 10,
    damage: [10, 10],
    lifetime: 1,
    hitbox: { r: 0.15 },
    sprite: { art: { kind: "static", file: "test/bolt" } },
    sound: { hitPlayer: "hitPlayer", hitEnemy: "hitEnemy" },
    ...changes,
  };
}

// One test projectile at a time, 4 shots a second.
export function testWeapon(changes: Partial<WeaponDef> = {}): WeaponDef {
  return { rate: 4, fires: [{ projectile: testProjectile() }], ...changes };
}

// A weapon item firing the test weapon. Give each item in a test its own
// name, so items that look alike can still be told apart.
export function testItem(
  changes: Partial<EquipmentItemDef> = {},
): EquipmentItemDef {
  return {
    name: "Test Staff",
    category: ITEM_CATEGORIES.EQUIPMENT,
    kind: ITEM_KIND.WEAPON,
    icon: "test/staff",
    loot: { tier: itemTier(1), tags: [] },
    weapon: testWeapon(),
    ...changes,
  };
}

export function testConsumable(
  changes: Partial<ConsumableItemDef> = {},
): ConsumableItemDef {
  return {
    name: "Test Consumable",
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: "test/consumable",
    loot: { tags: [] },
    ...changes,
  };
}

// A slime-like enemy: 150 health, 2 tiles/s, a 0.4-tile hitbox. Notices
// things within 7 tiles, wanders 2.5 tiles from home with no target and
// chases to 2.5 tiles with one. Unarmed unless given a weapon.
export function testEnemy(changes: Partial<EnemyDef> = {}): EnemyDef {
  return {
    sprite: {
      art: { kind: "static", file: "test/slime" },
      outline: { color: [0, 0, 0, 1] },
    },
    hitbox: { r: 0.4 },
    stats: {
      [STAT.HEALTH]: stat(150),
    },
    speed: 2,
    detectRange: 7,
    idle: { kind: "wander", radius: 2.5 },
    aggro: { kind: "chase", stopAt: 2.5 },
    deathSound: "enemyDeath",
    ...changes,
  };
}

// Every boss attack's timeline: a tell, a cast that fires CAST_CUE seconds
// in, and a recovery.
export const BOSS_TELL = 0.5;
export const BOSS_CAST = 0.25;
export const BOSS_CAST_CUE = 0.1;
export const BOSS_RECOVER = 0.5;
// A charge's dash, then the time it's exposed afterwards.
export const BOSS_DASH = 0.5;
export const BOSS_EXPOSED = 1;
export const BOSS_EXPOSED_MULTIPLIER = 1.5;
export const BOSS_RING_COUNT = 12;

function attack(weapon: ReturnType<typeof testWeapon>): BossSequence {
  return {
    stages: [
      {
        animation: "tell",
        duration: BOSS_TELL,
        movement: { kind: "stationary" },
        lockAim: true,
        cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
      },
      {
        animation: "cast",
        duration: BOSS_CAST,
        movement: { kind: "stationary" },
        cues: [{ at: BOSS_CAST_CUE, cue: { kind: "fire", weapon } }],
      },
      {
        animation: "recover",
        duration: BOSS_RECOVER,
        movement: { kind: "phase" },
      },
    ],
  };
}

// A three-phase boss with 1000 health, moving at 2.5 tiles/s:
// - awake: circles 6 tiles out; ring, spray, ring.
// - enraged, below 66%: chases to 3 tiles; charge, ring.
// - desperate, below 30%: frenzy, charge.
export function testBoss(): EnemyDef {
  return {
    sprite: { art: { kind: "static", file: "test/boss" } },
    hitbox: { r: 0.7 },
    stats: {
      [STAT.HEALTH]: stat(1000),
    },
    speed: 2.5,
    detectRange: 11,
    idle: { kind: "wander", radius: 2 },
    aggro: { kind: "orbit", radius: 6 },
    phases: {
      start: "awake",
      list: {
        awake: {
          rotation: ["ring", "spray", "ring"],
          next: [{ to: "enraged", when: { healthBelow: 0.66 } }],
        },
        enraged: {
          aggro: { kind: "chase", stopAt: 3 },
          rotation: ["charge", "ring"],
          next: [{ to: "desperate", when: { healthBelow: 0.3 } }],
        },
        desperate: { rotation: ["frenzy", "charge"] },
      },
    },
    sequences: {
      ring: attack(
        testWeapon({ fires: ring(testProjectile(), BOSS_RING_COUNT) }),
      ),
      spray: attack(testWeapon({ fires: spread(testProjectile(), 5, 0.3) })),
      frenzy: attack(testWeapon({ fires: ring(testProjectile(), 8) })),
      charge: {
        stages: [
          {
            animation: "tell",
            duration: BOSS_TELL,
            movement: { kind: "stationary" },
            lockAim: true,
          },
          {
            animation: "dash",
            duration: BOSS_DASH,
            movement: { kind: "dash", speedScale: 4 },
          },
          {
            animation: "exposed",
            duration: BOSS_EXPOSED,
            movement: { kind: "stationary" },
            vulnerable: BOSS_EXPOSED_MULTIPLIER,
          },
        ],
      },
    },
    deathSound: "bossDeath",
  };
}

// A character with 500 health walking 5 tiles/s, with a 0.4-tile hitbox.
export function testCharacter(
  changes: Partial<CharacterDef> = {},
): CharacterDef {
  return {
    name: "Tester",
    sprite: { art: { kind: "static", file: "test/character" } },
    hitbox: { r: 0.4 },
    stats: {
      [STAT.HEALTH]: stat(500),
      [STAT.MANA]: stat(100),
      [STAT.ATTACK]: stat(25, 75),
      [STAT.DEFENSE]: stat(0, 25),
      [STAT.SPEED]: stat(25, 75),
      [STAT.DEXTERITY]: stat(25, 75),
      [STAT.VITALITY]: stat(10, 75),
      [STAT.WISDOM]: stat(25, 75),
    },
    gravestone: { kind: "static", file: "test/gravestone" },
    ...changes,
  };
}
