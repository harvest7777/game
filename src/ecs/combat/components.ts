// How much damage something can still take. At 0 it dies (the player
// doesn't yet). Shared by the player and enemies; stats like defense and
// vitality will modify damage and regeneration around it later.
export type Health = { hp: number; max: number };
