import { defineEnemy } from "../../ecs/enemy/definitions";
import type { AnimatedArt, SpriteFile } from "../../ecs/sprite/art";
import { kingFrenzy } from "../weapons/kingFrenzy";
import { kingRing } from "../weapons/kingRing";
import { kingSpray } from "../weapons/kingSpray";
import { slimeKingLoot } from "../loot/pools";
import { nexusPortal } from "../portals/nexus";
import { STAT, stat } from "../../ecs/stats/components";

const CLIPS = [
  "idle",
  "ringTell",
  "ringCast",
  "aimTell",
  "sprayCast",
  "chargeTell",
  "chargeDash",
  "recover",
  "frenzyTell",
  "frenzyCast",
  "collapse",
  "exposed",
] as const;

// Three frames per clip, played across each stage's duration.
const SLIME_KING_ART: AnimatedArt<(typeof CLIPS)[number]> = {
  kind: "animated",
  clips: Object.fromEntries(
    CLIPS.map((clip) => [
      clip,
      [0, 1, 2].map((frame) => `enemies/slime-king/${clip}-${frame}`),
    ]),
  ) as Record<(typeof CLIPS)[number], SpriteFile[]>,
};

// A health-gated, deterministic encounter. Every attack's timeline owns
// its telegraph, release, movement and any weak-point window.
export const slimeKing = defineEnemy({
  sprite: {
    art: SLIME_KING_ART,
    scale: 1.8,
    outline: { color: [1, 0.85, 0.2, 1], glow: { radius: 1, pulseHz: 1 } },
  },
  hitbox: { r: 0.7 },
  stats: {
    [STAT.HEALTH]: stat(1500),
    [STAT.DEFENSE]: stat(8),
  },
  speed: 2.5,
  detectRange: 11,
  idle: { kind: "wander", radius: 2 },
  aggro: { kind: "orbit", radius: 6 },
  phases: {
    start: "awake",
    list: {
      awake: {
        rotation: ["crownRing", "aimedSpray", "crownRing"],
        next: [{ to: "enraged", when: { healthBelow: 0.66 } }],
      },
      enraged: {
        aggro: { kind: "chase", stopAt: 3 },
        rotation: ["charge", "ringCast", "charge", "aimedSpray"],
        next: [{ to: "desperate", when: { healthBelow: 0.3 } }],
      },
      desperate: {
        rotation: ["frenzy", "charge", "collapse"],
      },
    },
  },
  sequences: {
    crownRing: {
      stages: [
        {
          animation: "ringTell",
          duration: 0.55,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "ringCast",
          duration: 0.25,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.08, cue: { kind: "fire", weapon: kingRing } },
            { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
          ],
        },
        { animation: "recover", duration: 0.45, movement: { kind: "phase" } },
      ],
    },
    aimedSpray: {
      stages: [
        {
          animation: "aimTell",
          duration: 0.5,
          movement: { kind: "stationary" },
          lockAim: true,
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "sprayCast",
          duration: 0.25,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.08, cue: { kind: "fire", weapon: kingSpray } },
            { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
          ],
        },
        { animation: "recover", duration: 0.45, movement: { kind: "phase" } },
      ],
    },
    charge: {
      stages: [
        {
          animation: "chargeTell",
          duration: 0.55,
          movement: { kind: "stationary" },
          lockAim: true,
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "chargeDash",
          duration: 0.6,
          movement: { kind: "dash", speedScale: 4 },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossDash" } }],
        },
        {
          animation: "exposed",
          duration: 0.8,
          movement: { kind: "stationary" },
          vulnerable: 1.5,
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossExpose" } }],
        },
      ],
    },
    ringCast: {
      stages: [
        {
          animation: "ringTell",
          duration: 0.4,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "ringCast",
          duration: 0.25,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.06, cue: { kind: "fire", weapon: kingRing } },
            { at: 0.06, cue: { kind: "sound", sound: "bossCast" } },
          ],
        },
        { animation: "recover", duration: 0.35, movement: { kind: "phase" } },
      ],
    },
    frenzy: {
      stages: [
        {
          animation: "frenzyTell",
          duration: 0.45,
          movement: { kind: "stationary" },
          cues: [{ at: 0, cue: { kind: "sound", sound: "bossWindup" } }],
        },
        {
          animation: "frenzyCast",
          duration: 0.35,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.08, cue: { kind: "fire", weapon: kingFrenzy } },
            { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
          ],
        },
        {
          animation: "frenzyCast",
          duration: 0.35,
          movement: { kind: "stationary" },
          cues: [
            { at: 0.08, cue: { kind: "fire", weapon: kingFrenzy } },
            { at: 0.08, cue: { kind: "sound", sound: "bossCast" } },
          ],
        },
        { animation: "recover", duration: 0.4, movement: { kind: "phase" } },
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
          duration: 1.25,
          movement: { kind: "stationary" },
          vulnerable: 2,
        },
        { animation: "recover", duration: 0.45, movement: { kind: "phase" } },
      ],
    },
  },
  loot: slimeKingLoot,
  deathSound: "bossDeath",
  deathPortal: nexusPortal,
  quest: true,
});
