// Gameplay stats. These constants are the only identifiers used by content,
// systems and the HUD; no system looks stats up by an authored string.
export const STAT = {
  HEALTH: "health",
  MANA: "mana",
  ATTACK: "attack",
  DEFENSE: "defense",
  SPEED: "speed",
  DEXTERITY: "dexterity",
  VITALITY: "vitality",
  WISDOM: "wisdom",
} as const;

export type StatKind = (typeof STAT)[keyof typeof STAT];

export const STAT_KINDS = [
  STAT.HEALTH,
  STAT.MANA,
  STAT.ATTACK,
  STAT.DEFENSE,
  STAT.SPEED,
  STAT.DEXTERITY,
  STAT.VITALITY,
  STAT.WISDOM,
] as const satisfies readonly StatKind[];

export const ATTRIBUTE_STATS = [
  STAT.ATTACK,
  STAT.DEFENSE,
  STAT.SPEED,
  STAT.DEXTERITY,
  STAT.VITALITY,
  STAT.WISDOM,
] as const;

// For Health and Mana, value is the resource left and max is its capacity.
// For attributes, value is the base rating and max is the class cap.
export type StatValue = { value: number; max: number };

export type StatBlock = Partial<Record<StatKind, StatValue>>;
export type CompleteStatBlock = Record<StatKind, StatValue>;
export type LivingStatBlock = StatBlock & Record<typeof STAT.HEALTH, StatValue>;

export function stat(value: number, max: number = value): StatValue {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(max) ||
    value < 0 ||
    max < 0 ||
    value > max
  ) {
    throw new Error(`invalid stat ${value}/${max}`);
  }
  return { value, max };
}
