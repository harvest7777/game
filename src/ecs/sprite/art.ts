// What an entity's art is: plain data naming PNG files, which the renderer
// loads into its atlas and picks frames from. Definitions hold their art
// directly, so there are no sprite names to keep in sync.

// Paths are relative to public/sprites, without the .png extension.
export type SpriteFile = string;

export type Facings = {
  front: SpriteFile[];
  back: SpriteFile[];
  side: SpriteFile[];
};

// A walker has three facings, each [standing, step 1, step 2]. Side frames
// face right; the renderer mirrors them for left. `attack` has the same
// shape, with the weapon thrust out, shown in time with its shots.
export type WalkerArt = Facings & {
  kind: "walker";
  attack?: Facings;
};

export type StaticArt = { kind: "static"; file: SpriteFile };

// Explicit clips for authored animations. Stage duration determines playback;
// clip frame counts are visual-only and can change without touching gameplay.
// `Clip` names the clips, so a boss's stages can only name clips it has.
export type AnimatedArt<Clip extends string = string> = {
  kind: "animated";
  clips: Record<Clip, SpriteFile[]>;
};

// A creature that loops `idle` frames, and plays `attack` around each
// shot: the first half of the frames winding up before it, the rest
// releasing after, so the swing lands with the shot.
export type CreatureArt = {
  kind: "creature";
  idle: SpriteFile[];
  attack: SpriteFile[];
};

export type SpriteArt<Clip extends string = string> =
  WalkerArt | StaticArt | AnimatedArt<Clip> | CreatureArt;

// The clip an animated sprite shows when nothing is playing.
export const IDLE_CLIP = "idle";
