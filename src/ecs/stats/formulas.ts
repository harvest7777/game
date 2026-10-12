// Missing attributes are neutral so ordinary enemies keep their authored
// movement, damage and fire rate until a definition opts into that stat.
export function attackMultiplier(attack: number | undefined): number {
  return attack === undefined ? 1 : Math.max(0, 0.5 + attack / 50);
}

export function fireRateMultiplier(dexterity: number | undefined): number {
  return dexterity === undefined ? 1 : Math.max(0, 0.75 + dexterity / 100);
}

export function tilesPerSecond(speed: number): number {
  return Math.max(0, 4 + speed / 25);
}

export function healthPerSecond(vitality: number): number {
  return Math.max(0, vitality * 0.1);
}

export function manaPerSecond(wisdom: number): number {
  return Math.max(0, wisdom * 0.1);
}

export const MINIMUM_DAMAGE_FRACTION = 0.15;

export function damageAfterDefense(damage: number, defense: number): number {
  if (damage <= 0) return 0;
  return Math.max(
    damage * MINIMUM_DAMAGE_FRACTION,
    damage - Math.max(0, defense),
  );
}
