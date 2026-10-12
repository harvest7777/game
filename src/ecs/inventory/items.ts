import type { WeaponDef } from "../projectile/weapons";
import type { SpriteFile } from "../sprite/art";
import { STAT_KINDS, type StatKind } from "../stats/components";

// Every kind of item, in the order their equipment slots are shown. Each
// kind has one equipment slot.
export const ITEM_KINDS = ["weapon", "ability", "armor", "ring"] as const;

export const ITEM_KIND = {
  WEAPON: ITEM_KINDS[0],
  ABILITY: ITEM_KINDS[1],
  ARMOR: ITEM_KINDS[2],
  RING: ITEM_KINDS[3],
} as const;

// Which equipment slot an item goes in.
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_CATEGORIES = {
  EQUIPMENT: "equipment",
  CONSUMABLE: "consumable",
} as const;

export type ItemCategory =
  (typeof ITEM_CATEGORIES)[keyof typeof ITEM_CATEGORIES];

declare const ITEM_TIER: unique symbol;
export type ItemTier = number & { readonly [ITEM_TIER]: true };

export function itemTier(value: number): ItemTier {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`item tier must be a non-negative integer, got ${value}`);
  }
  return value as ItemTier;
}

declare const ITEM_TAG: unique symbol;
export type ItemTagDef = Readonly<{
  name: string;
  readonly [ITEM_TAG]: true;
}>;

export function defineItemTag(name: string): ItemTagDef {
  return Object.freeze({ name }) as ItemTagDef;
}

export type ItemLootProfile = Readonly<{
  tier?: ItemTier;
  tags: readonly ItemTagDef[];
}>;

// Added to the wearer's base stats while this item is equipped. Health and
// Mana bonuses raise their effective capacity; the other six raise their
// effective value. Stored base values and caps never change.
export type StatBonuses = Readonly<Partial<Record<StatKind, number>>>;

type BaseItemDef = {
  name: string;
  icon: SpriteFile;
  loot: ItemLootProfile;
};

export type EquipmentItemDef = BaseItemDef & {
  category: typeof ITEM_CATEGORIES.EQUIPMENT;
  kind: ItemKind;
  weapon?: WeaponDef;
  bonuses: StatBonuses;
};

// What using a consumable does. Each kind is one entry in USE_EFFECTS.
export type ConsumableEffect =
  // Restores `amount` health, up to its maximum.
  { kind: "heal"; amount: number };

export type ConsumableItemDef = BaseItemDef & {
  category: typeof ITEM_CATEGORIES.CONSUMABLE;
  // Used up when the player uses it (its number key, or a double-click).
  use: ConsumableEffect;
};

// What a kind of item is. Each item is its own file under src/content/items.
// Equipment has a slot; consumables live only in general-purpose containers.
export type ItemDef = EquipmentItemDef | ConsumableItemDef;

export function isEquipmentItem(item: ItemDef): item is EquipmentItemDef {
  return item.category === ITEM_CATEGORIES.EQUIPMENT;
}

// Runtime definitions keep direct references. JSON names those references by
// id, and the content registry resolves them once when it loads.
export type ItemRegistries = {
  weapons: Readonly<Record<string, WeaponDef>>;
  tags: Readonly<Record<string, ItemTagDef>>;
};

export function itemDef(value: unknown, registries: ItemRegistries): ItemDef {
  const fields = object("item", value);
  const name = string("name", fields.name);
  const category = oneOf(
    "category",
    fields.category,
    Object.values(ITEM_CATEGORIES),
  );
  const icon = string("icon", fields.icon);
  const loot = lootProfile(fields.loot, registries.tags);

  if (category === ITEM_CATEGORIES.CONSUMABLE) {
    exactFields("item", fields, ["name", "category", "icon", "loot", "use"]);
    return { name, category, icon, loot, use: useEffect(fields.use) };
  }

  exactFields("item", fields, [
    "name",
    "category",
    "kind",
    "icon",
    "loot",
    "bonuses",
    ...(fields.weapon === undefined ? [] : ["weapon"]),
  ]);
  const kind = oneOf("kind", fields.kind, ITEM_KINDS);
  const weaponId =
    fields.weapon === undefined ? undefined : string("weapon", fields.weapon);
  const weapon =
    weaponId === undefined ? undefined : registries.weapons[weaponId];
  if (weaponId !== undefined && !weapon) {
    fail("weapon", `unknown id \"${weaponId}\"`);
  }
  if (kind === ITEM_KIND.WEAPON && !weapon) {
    fail("weapon", "is required for a weapon item");
  }
  if (kind !== ITEM_KIND.WEAPON && weapon) {
    fail("weapon", "is only allowed on weapon items");
  }
  return {
    name,
    category,
    kind,
    icon,
    loot,
    bonuses: statBonuses(fields.bonuses),
    ...(weapon && { weapon }),
  };
}

export function equipmentItemDef(
  value: unknown,
  registries: ItemRegistries,
): EquipmentItemDef {
  const item = itemDef(value, registries);
  if (!isEquipmentItem(item)) fail("category", "should be equipment");
  return item;
}

export function consumableItemDef(
  value: unknown,
  registries: ItemRegistries,
): ConsumableItemDef {
  const item = itemDef(value, registries);
  if (isEquipmentItem(item)) fail("category", "should be consumable");
  return item;
}

type Fields = Record<string, unknown>;

function object(path: string, value: unknown): Fields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "should be an object");
  }
  return value as Fields;
}

function exactFields(path: string, fields: Fields, allowed: string[]): void {
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) fail(path, `has unknown field \"${key}\"`);
  }
  for (const key of allowed) {
    if (!(key in fields)) fail(path, `is missing \"${key}\"`);
  }
}

function string(path: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return fail(path, "should be a non-empty string");
  }
  return value;
}

function number(path: string, value: unknown, whole = false): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (whole && !Number.isSafeInteger(value))
  ) {
    return fail(
      path,
      `should be a non-negative${whole ? " whole" : ""} number`,
    );
  }
  return value;
}

function oneOf<T extends string>(
  path: string,
  value: unknown,
  options: readonly T[],
): T {
  if (!options.includes(value as T)) {
    return fail(path, `should be one of ${options.join(", ")}`);
  }
  return value as T;
}

function lootProfile(
  value: unknown,
  tags: ItemRegistries["tags"],
): ItemLootProfile {
  const fields = object("loot", value);
  exactFields("loot", fields, [
    ...(fields.tier === undefined ? [] : ["tier"]),
    "tags",
  ]);
  if (!Array.isArray(fields.tags)) fail("loot.tags", "should be a list");
  const resolvedTags = (fields.tags as unknown[]).map((value, index) => {
    const id = string(`loot.tags[${index}]`, value);
    return tags[id] ?? fail(`loot.tags[${index}]`, `unknown id \"${id}\"`);
  });
  return {
    ...(fields.tier !== undefined && {
      tier: itemTier(number("loot.tier", fields.tier, true)),
    }),
    tags: resolvedTags,
  };
}

function statBonuses(value: unknown): StatBonuses {
  const fields = object("bonuses", value);
  const bonuses: Partial<Record<StatKind, number>> = {};
  for (const [kind, amount] of Object.entries(fields)) {
    if (!STAT_KINDS.includes(kind as StatKind)) {
      fail("bonuses", `has unknown stat \"${kind}\"`);
    }
    bonuses[kind as StatKind] = number(`bonuses.${kind}`, amount);
  }
  return bonuses;
}

function useEffect(value: unknown): ConsumableEffect {
  const fields = object("use", value);
  const kind = oneOf("use.kind", fields.kind, ["heal"] as const);
  switch (kind) {
    case "heal":
      exactFields("use", fields, ["kind", "amount"]);
      return { kind, amount: number("use.amount", fields.amount) };
  }
}

function fail(path: string, message: string): never {
  throw new Error(`invalid item: ${path} ${message}`);
}
