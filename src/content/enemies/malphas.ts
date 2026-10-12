import { OUTLINED } from "./shared";
import { defineEnemy } from "../../ecs/enemy/definitions";
import type { AnimatedArt, SpriteFile } from "../../ecs/sprite/art";
import { STAT, stat } from "../../ecs/stats/components";
import { malphasLoot } from "../loot/pools";
import { nexusPortal } from "../portals/nexus";
import { malphasFrenzy } from "../weapons/malphasFrenzy";
import { malphasRing } from "../weapons/malphasRing";
import { malphasShockwave } from "../weapons/malphasShockwave";
import { malphasVolley } from "../weapons/malphasVolley";
import { protectorPinwheel } from "../weapons/protectorPinwheel";
import { imp } from "./imp";
import { malphasFlamer } from "./malphasFlamer";

const CLIPS = [
  "idle",
  "castTell",
  "cast",
  "summonTell",
  "summon",
  "dashTell",
  "dash",
  "slam",
  "exposed",
  "frenzyTell",
  "frenzy",
  "collapse",
] as const;

// Three frames per clip, played across each stage's duration.
const MALPHAS_ART: AnimatedArt<(typeof CLIPS)[number]> = {
  kind: "animated",
  clips: Object.fromEntries(
    CLIPS.map((clip) => [
      clip,
      [0, 1, 2].map((frame) => `enemies/malphas/${clip}-${frame}`),
    ]),
  ) as Record<(typeof CLIPS)[number], SpriteFile[]>,
};

// Archdemon Malphas, lord of the Abyss, waiting in its throne room. He
// fights in three phases, each a fixed rotation of telegraphed moves:
// - Awaken (above 70%): circles at range, casting rings and aimed lances,
//   and summons imps while invulnerable.
// - Inferno (70% to 35%): dashes at you and slams down in a shockwave,
//   left exposed after; spins out pinwheels of flame; summons flamers.
// - Desperation (below 35%): chases you with crossing frenzies of curling
//   flame, until he collapses, taking double damage.
// He opens the way home when he falls.
export const malphas = defineEnemy({
  sprite: {
    art: MALPHAS_ART,
    scale: 1.8,
    outline: OUTLINED,
  },
  hitbox: { r: 0.9 },
  stats: {
    [STAT.HEALTH]: stat(5000),
    [STAT.DEFENSE]: stat(12),
  },
  speed: 3,
  detectRange: 13,
  idle: { kind: "stationary" },
  aggro: { kind: "orbit", radius: 7 },
  phases: {
    start: "awaken",
    list: {
      awaken: {
        rotation: [
          "flameRing",
          "aimedVolley",
          "summonImps",
          "flameRing",
          "aimedVolley",
        ],
        next: [{ to: "inferno", when: { healthBelow: 0.7 } }],
      },
      inferno: {
        aggro: { kind: "orbit", radius: 5 },
        rotation: ["dashSlam", "pinwheels", "summonFlamers", "aimedVolley"],
        next: [{ to: "desperation", when: { healthBelow: 0.35 } }],
      },
      desperation: {
        aggro: { kind: "chase", stopAt: 4 },
        rotation: ["frenzy", "dashSlam", "frenzy", "collapse"],
      },
    },
  },
  sequences: {
    flameRing: {
      stages: [
        {
          animation: "castTell",
          duration: 0.7,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "cast",
          duration: 0.5,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.08, cue: { kind: "fire", weapon: malphasRing } },
            { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
          ],
        },
        { animation: "idle", duration: 0.6, movement: { kind: "phase" } },
      ],
    },
    aimedVolley: {
      stages: [
        {
          animation: "castTell",
          duration: 0.6,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "cast",
          duration: 0.9,
          movement: { kind: "stationary" },
          lockAim: true,
          cues: [
            { at: 0.05, cue: { kind: "fire", weapon: malphasVolley } },
            { at: 0.35, cue: { kind: "fire", weapon: malphasVolley } },
            { at: 0.65, cue: { kind: "fire", weapon: malphasVolley } },
          ],
        },
        { animation: "idle", duration: 0.5, movement: { kind: "phase" } },
      ],
    },
    summonImps: {
      stages: [
        {
          animation: "summonTell",
          duration: 0.8,
          movement: { kind: "stationary" },
          invulnerable: true,
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "summon",
          duration: 0.7,
          movement: { kind: "stationary" },
          invulnerable: true,
          cues: [
            {
              at: 0.2,
              cue: { kind: "summon", enemy: imp, count: 3, radius: 3, max: 4 },
            },
          ],
        },
        { animation: "idle", duration: 0.5, movement: { kind: "phase" } },
      ],
    },
    dashSlam: {
      stages: [
        {
          animation: "dashTell",
          duration: 0.7,
          movement: { kind: "stationary" },
          lockAim: true,
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "dash",
          duration: 0.6,
          movement: { kind: "dash", speedScale: 4 },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossDash" } }],
        },
        {
          animation: "slam",
          duration: 0.4,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "fire", weapon: malphasShockwave } }],
        },
        {
          animation: "exposed",
          duration: 1.4,
          movement: { kind: "stationary" },
          vulnerable: 1.5,
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossExpose" } }],
        },
      ],
    },
    pinwheels: {
      stages: [
        {
          animation: "castTell",
          duration: 0.6,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "cast",
          duration: 1.5,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.1, cue: { kind: "fire", weapon: protectorPinwheel } },
            { at: 0.6, cue: { kind: "fire", weapon: malphasRing } },
            { at: 1.1, cue: { kind: "fire", weapon: protectorPinwheel } },
          ],
        },
        { animation: "idle", duration: 0.5, movement: { kind: "phase" } },
      ],
    },
    summonFlamers: {
      stages: [
        {
          animation: "summonTell",
          duration: 0.8,
          movement: { kind: "stationary" },
          invulnerable: true,
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "summon",
          duration: 0.6,
          movement: { kind: "stationary" },
          invulnerable: true,
          cues: [
            {
              at: 0.2,
              cue: {
                kind: "summon",
                enemy: malphasFlamer,
                count: 2,
                radius: 4,
                max: 3,
              },
            },
          ],
        },
        { animation: "idle", duration: 0.5, movement: { kind: "phase" } },
      ],
    },
    frenzy: {
      stages: [
        {
          animation: "frenzyTell",
          duration: 0.8,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "frenzy",
          duration: 1.6,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.1, cue: { kind: "fire", weapon: malphasFrenzy } },
            { at: 0.1, cue: { kind: "sound", sound: "bossCast" } },
            { at: 0.8, cue: { kind: "fire", weapon: malphasFrenzy } },
            { at: 1.5, cue: { kind: "fire", weapon: malphasFrenzy } },
          ],
        },
        { animation: "idle", duration: 0.4, movement: { kind: "phase" } },
      ],
    },
    collapse: {
      stages: [
        {
          animation: "collapse",
          duration: 0.5,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossExpose" } }],
        },
        {
          animation: "exposed",
          duration: 2,
          movement: { kind: "stationary" },
          vulnerable: 2,
        },
        { animation: "idle", duration: 0.5, movement: { kind: "phase" } },
      ],
    },
  },
  loot: malphasLoot,
  deathSound: "bossDeath",
  deathPortal: nexusPortal,
  quest: true,
});
