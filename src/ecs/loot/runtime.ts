import {
  ITEM_CATEGORIES,
  ITEM_KINDS,
  isEquipmentItem,
  type ItemCategory,
  type ItemDef,
  type ItemKind,
  type ItemTagDef,
  type ItemTier,
} from "../inventory/items";
import {
  LOOT_SELECTIONS,
  LOOT_SOURCE_KINDS,
  type ItemQuery,
  type LootBagDef,
  type LootSource,
  type LootTableDef,
} from "./definitions";

type CompiledSource =
  | { kind: "items"; items: readonly ItemDef[] }
  | { kind: "groups"; groups: readonly (readonly ItemDef[])[] }
  | {
      kind: "weighted";
      options: readonly { weight: number; source: CompiledSource }[];
      totalWeight: number;
    };

type CompiledRule = {
  chance: number;
  rolls: number;
  source: CompiledSource;
};

type CompiledTable = { rules: readonly CompiledRule[] };

type CompiledBag = { def: LootBagDef; items: ReadonlySet<ItemDef> };

export type LootRuntime = Readonly<{
  tables: ReadonlyMap<LootTableDef, CompiledTable>;
  bags: readonly CompiledBag[];
}>;

type LootContent = Readonly<{
  items: readonly ItemDef[];
  tables: readonly LootTableDef[];
  bags: readonly LootBagDef[];
}>;

type Catalog = {
  all: readonly ItemDef[];
  order: ReadonlyMap<ItemDef, number>;
  categories: ReadonlyMap<ItemCategory, readonly ItemDef[]>;
  kinds: ReadonlyMap<ItemKind, readonly ItemDef[]>;
  tiers: ReadonlyMap<ItemTier, readonly ItemDef[]>;
  tags: ReadonlyMap<ItemTagDef, readonly ItemDef[]>;
};

export function emptyLootRuntime(): LootRuntime {
  return { tables: new Map(), bags: [] };
}

export function createLootRuntime(content: LootContent): LootRuntime {
  if (new Set(content.items).size !== content.items.length) {
    throw new Error(
      "item registry contains the same definition more than once",
    );
  }
  const catalog = createCatalog(content.items);
  const queryCache = new Map<ItemQuery, readonly ItemDef[]>();
  const compileQuery = (query: ItemQuery) => {
    const cached = queryCache.get(query);
    if (cached) return cached;
    const items = queryItems(catalog, query);
    queryCache.set(query, items);
    return items;
  };

  const tables = new Map<LootTableDef, CompiledTable>();
  for (const table of new Set(content.tables)) {
    tables.set(table, {
      rules: table.rules.map((rule) => {
        if (
          rule.chance < 0 ||
          rule.chance > 1 ||
          !Number.isFinite(rule.chance)
        ) {
          throw new Error(
            `loot chance must be between 0 and 1, got ${rule.chance}`,
          );
        }
        if (!Number.isSafeInteger(rule.rolls) || rule.rolls < 1) {
          throw new Error(
            `loot rolls must be a positive integer, got ${rule.rolls}`,
          );
        }
        return {
          chance: rule.chance,
          rolls: rule.rolls,
          source: compileSource(rule.source, catalog, compileQuery),
        };
      }),
    });
  }

  const priorities = new Set<number>();
  const bags = [...content.bags]
    .map((def): CompiledBag => {
      if (!Number.isFinite(def.priority) || priorities.has(def.priority)) {
        throw new Error(
          `loot bag priority must be finite and unique: ${def.priority}`,
        );
      }
      priorities.add(def.priority);
      if (!Number.isSafeInteger(def.capacity) || def.capacity < 1) {
        throw new Error(`${def.name} capacity must be a positive integer`);
      }
      if (!Number.isFinite(def.lifetime) || def.lifetime <= 0) {
        throw new Error(`${def.name} lifetime must be positive`);
      }
      const queries = Array.isArray(def.matches) ? def.matches : [def.matches];
      if (queries.length === 0) {
        throw new Error(`${def.name} must have at least one item query`);
      }
      const expiryFlash = def.expiryFlash;
      if (
        expiryFlash &&
        (!Number.isFinite(expiryFlash.duration) ||
          expiryFlash.duration <= 0 ||
          expiryFlash.duration > def.lifetime)
      ) {
        throw new Error(
          `${def.name} expiry flash duration must be positive and no longer than its lifetime`,
        );
      }
      if (
        expiryFlash &&
        (!Number.isFinite(expiryFlash.startFrequency) ||
          !Number.isFinite(expiryFlash.endFrequency) ||
          expiryFlash.startFrequency <= 0 ||
          expiryFlash.endFrequency < expiryFlash.startFrequency)
      ) {
        throw new Error(
          `${def.name} expiry flash frequencies must be positive and increasing`,
        );
      }
      return {
        def,
        items: new Set(queries.flatMap((query) => compileQuery(query))),
      };
    })
    .sort((a, b) => b.def.priority - a.def.priority);

  for (const item of content.items) {
    if (!bagForItem({ tables, bags }, item)) {
      throw new Error(`${item.name} does not match any loot bag`);
    }
  }
  return { tables, bags };
}

// Every item a table drops this time. `chanceScale` multiplies each rule's
// chance (capped at certain), for tuning and testing drop rates.
export function rollLoot(
  runtime: LootRuntime,
  table: LootTableDef,
  random: () => number,
  chanceScale = 1,
): ItemDef[] {
  const compiled = runtime.tables.get(table);
  if (!compiled) throw new Error("loot table was not compiled into this world");
  const items: ItemDef[] = [];
  for (const rule of compiled.rules) {
    for (let roll = 0; roll < rule.rolls; roll++) {
      const chance = Math.min(1, rule.chance * chanceScale);
      if (chance < 1 && random() >= chance) continue;
      items.push(choose(rule.source, random));
    }
  }
  return items;
}

export function bagForItem(
  runtime: LootRuntime,
  item: ItemDef,
): LootBagDef | undefined {
  return runtime.bags.find((bag) => bag.items.has(item))?.def;
}

export type LootBundle = { bag: LootBagDef; items: ItemDef[] };

export function bundleLoot(
  runtime: LootRuntime,
  dropped: readonly ItemDef[],
): LootBundle[] {
  const ranked = dropped.map((item, order) => {
    const bag = bagForItem(runtime, item);
    if (!bag) throw new Error(`${item.name} does not match any loot bag`);
    return { item, order, bag };
  });
  ranked.sort((a, b) => b.bag.priority - a.bag.priority || a.order - b.order);

  const bundles: LootBundle[] = [];
  while (ranked.length > 0) {
    const capacity = ranked[0].bag.capacity;
    const group = ranked.splice(0, capacity);
    const bag = group.reduce(
      (highest, entry) =>
        entry.bag.priority > highest.priority ? entry.bag : highest,
      group[0].bag,
    );
    bundles.push({ bag, items: group.map(({ item }) => item) });
  }
  return bundles;
}

function compileSource(
  source: LootSource,
  catalog: Catalog,
  compileQuery: (query: ItemQuery) => readonly ItemDef[],
): CompiledSource {
  if (source.kind === LOOT_SOURCE_KINDS.EXACT) {
    if (source.items.length === 0)
      throw new Error("exact loot source is empty");
    for (const item of source.items) {
      if (!catalog.order.has(item)) {
        throw new Error(`${item.name} is not in the item registry`);
      }
    }
    return { kind: "items", items: source.items };
  }
  if (source.kind === LOOT_SOURCE_KINDS.QUERY) {
    const items = compileQuery(source.query);
    if (items.length === 0) throw new Error("loot query matches no items");
    if (source.selection === LOOT_SELECTIONS.ITEM) {
      return { kind: "items", items };
    }
    const groups = ITEM_KINDS.map((kind) =>
      items.filter(
        (item) =>
          item.category === ITEM_CATEGORIES.EQUIPMENT && item.kind === kind,
      ),
    ).filter((group) => group.length > 0);
    if (groups.length === 0) {
      throw new Error("equipment-kind loot query matches no equipment");
    }
    return { kind: "groups", groups };
  }
  if (source.options.length === 0)
    throw new Error("weighted loot source is empty");
  let totalWeight = 0;
  const options = source.options.map((option) => {
    if (!Number.isFinite(option.weight) || option.weight <= 0) {
      throw new Error(`loot weight must be positive, got ${option.weight}`);
    }
    totalWeight += option.weight;
    return {
      weight: option.weight,
      source: compileSource(option.source, catalog, compileQuery),
    };
  });
  return { kind: "weighted", options, totalWeight };
}

function choose(source: CompiledSource, random: () => number): ItemDef {
  if (source.kind === "items") return source.items[index(source.items, random)];
  if (source.kind === "groups") {
    const group = source.groups[index(source.groups, random)];
    return group[index(group, random)];
  }
  let roll = random() * source.totalWeight;
  for (const option of source.options) {
    roll -= option.weight;
    if (roll < 0) return choose(option.source, random);
  }
  return choose(source.options[source.options.length - 1].source, random);
}

function index(values: readonly unknown[], random: () => number): number {
  return Math.min(values.length - 1, Math.floor(random() * values.length));
}

function createCatalog(items: readonly ItemDef[]): Catalog {
  return {
    all: items,
    order: new Map(items.map((item, index) => [item, index])),
    categories: groupBy(items, (item) => item.category),
    kinds: groupBy(items.filter(isEquipmentItem), (item) => item.kind),
    tiers: groupBy(
      items.filter((item) => item.loot.tier !== undefined),
      (item) => item.loot.tier!,
    ),
    tags: groupMany(items, (item) => item.loot.tags),
  };
}

function queryItems(catalog: Catalog, query: ItemQuery): readonly ItemDef[] {
  if (query.tier && query.tier.min > query.tier.max) {
    throw new Error("loot tier range minimum exceeds its maximum");
  }
  const seeds: (readonly ItemDef[])[] = [];
  if (query.categories) {
    seeds.push(
      query.categories.flatMap((value) => catalog.categories.get(value) ?? []),
    );
  }
  if (query.kinds) {
    seeds.push(query.kinds.flatMap((value) => catalog.kinds.get(value) ?? []));
  }
  if (query.tiered) seeds.push([...catalog.tiers.values()].flat());
  if (query.tier) {
    seeds.push(
      [...catalog.tiers].flatMap(([tier, items]) =>
        tier >= query.tier!.min && tier <= query.tier!.max ? items : [],
      ),
    );
  }
  for (const tag of query.tags ?? []) seeds.push(catalog.tags.get(tag) ?? []);
  const seed =
    seeds.length === 0
      ? catalog.all
      : seeds.reduce((smallest, values) =>
          values.length < smallest.length ? values : smallest,
        );
  return [...new Set(seed)]
    .filter((item) => matches(item, query))
    .sort((a, b) => catalog.order.get(a)! - catalog.order.get(b)!);
}

function matches(item: ItemDef, query: ItemQuery): boolean {
  if (query.categories && !query.categories.includes(item.category))
    return false;
  if (
    query.kinds &&
    (item.category !== ITEM_CATEGORIES.EQUIPMENT ||
      !query.kinds.includes(item.kind))
  ) {
    return false;
  }
  const tier = item.loot.tier;
  if (query.tiered && tier === undefined) return false;
  if (
    query.tier &&
    (tier === undefined || tier < query.tier.min || tier > query.tier.max)
  ) {
    return false;
  }
  return (query.tags ?? []).every((tag) => item.loot.tags.includes(tag));
}

function groupBy<T extends ItemDef, K>(
  items: readonly T[],
  keyOf: (item: T) => K,
): ReadonlyMap<K, readonly T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function groupMany<K>(
  items: readonly ItemDef[],
  keysOf: (item: ItemDef) => readonly K[],
): ReadonlyMap<K, readonly ItemDef[]> {
  const groups = new Map<K, ItemDef[]>();
  for (const item of items) {
    for (const key of keysOf(item)) {
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }
  }
  return groups;
}
