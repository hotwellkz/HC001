import type { ProceduralTextureKind } from "./proceduralDiffuseTextures";

export interface TextureCatalogCategory {
  readonly id: string;
  readonly labelRu: string;
}

/** Порядок в UI — не хардкодить подписи в компоненте. */
export const TEXTURE_CATALOG_CATEGORIES: readonly TextureCatalogCategory[] = [
  { id: "wood", labelRu: "Дерево" },
  { id: "wood2", labelRu: "Дерево 2" },
  { id: "panels", labelRu: "Плиты" },
  { id: "design", labelRu: "Дизайн" },
  { id: "stone", labelRu: "Камень" },
  { id: "brick", labelRu: "Кирпич" },
  { id: "roof", labelRu: "Крыша" },
  { id: "color", labelRu: "Цвет" },
  { id: "plaster", labelRu: "Штукатурка" },
] as const;

export interface TextureCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly procedural: { readonly kind: ProceduralTextureKind; readonly seed: number };
  /** Линейный размер одной «плитки» в метрах при 100% масштаба (меньше — чаще повтор). */
  readonly defaultScaleM: number;
}

function e(
  id: string,
  name: string,
  categoryId: string,
  kind: ProceduralTextureKind,
  seed: number,
  defaultScaleM: number,
): TextureCatalogEntry {
  return { id, name, categoryId, procedural: { kind, seed }, defaultScaleM };
}

/** Стартовая библиотека; новые материалы — новые элементы массива. */
export const TEXTURE_CATALOG_ENTRIES: readonly TextureCatalogEntry[] = [
  // Дерево (8)
  e("wood-siberian-1", "Сибирская сосна", "wood", "wood", 101, 0.42),
  e("wood-oak-1", "Дуб натуральный", "wood", "wood", 203, 0.38),
  e("wood-walnut-1", "Орех тёмный", "wood", "wood", 305, 0.4),
  e("wood-pine-1", "Сосна светлая", "wood", "wood", 407, 0.48),
  e("wood-ash-1", "Ясень", "wood", "wood", 509, 0.41),
  e("wood-maple-1", "Клён", "wood", "wood", 611, 0.39),
  e("wood-teak-1", "Тик", "wood", "wood", 713, 0.36),
  e("wood-beech-1", "Бук", "wood", "wood", 815, 0.43),
  // Дерево 2 — горизонтальный рисунок (6)
  e("wood2-panel-1", "Панель рустик", "wood2", "wood2", 120, 0.5),
  e("wood2-panel-2", "Панель натуральная", "wood2", "wood2", 220, 0.46),
  e("wood2-panel-3", "Панель тёплая", "wood2", "wood2", 320, 0.44),
  e("wood2-panel-4", "Панель холодная", "wood2", "wood2", 420, 0.52),
  e("wood2-panel-5", "Панель выбеленная", "wood2", "wood2", 520, 0.47),
  e("wood2-panel-6", "Панель контраст", "wood2", "wood2", 620, 0.45),
  // Плиты — OSB (ориентированно-стружечная; отдельный визуал от wood)
  e("panel-osb-1", "OSB", "panels", "osb", 1801, 0.64),
  // Дизайн (5)
  e("design-geo-1", "Линии минимализм", "design", "design", 901, 0.55),
  e("design-geo-2", "Абстракция 2", "design", "design", 902, 0.52),
  e("design-geo-3", "Абстракция 3", "design", "design", 903, 0.58),
  e("design-geo-4", "Абстракция 4", "design", "design", 904, 0.5),
  e("design-geo-5", "Абстракция 5", "design", "design", 905, 0.54),
  // Камень (6)
  e("stone-granite-1", "Гранит серый", "stone", "stone", 1301, 0.35),
  e("stone-granite-2", "Гранит тёплый", "stone", "stone", 1302, 0.34),
  e("stone-limestone-1", "Известняк", "stone", "stone", 1303, 0.4),
  e("stone-slate-1", "Сланец", "stone", "stone", 1304, 0.32),
  e("stone-basalt-1", "Базальт", "stone", "stone", 1305, 0.33),
  e("stone-sand-1", "Песчаник", "stone", "stone", 1306, 0.38),
  // Кирпич (6)
  e("brick-red-1", "Кирпич красный", "brick", "brick", 1401, 0.22),
  e("brick-red-2", "Кирпич терракота", "brick", "brick", 1402, 0.21),
  e("brick-brown-1", "Кирпич шоколад", "brick", "brick", 1403, 0.23),
  e("brick-orange-1", "Кирпич охра", "brick", "brick", 1404, 0.22),
  e("brick-mix-1", "Кирпич пёстрый", "brick", "brick", 1405, 0.2),
  e("brick-mix-2", "Кирпич рустик", "brick", "brick", 1406, 0.24),
  // Крыша (5)
  e("roof-sheet-1", "Профлист графит", "roof", "roof", 1501, 0.28),
  e("roof-sheet-2", "Профлист коричневый", "roof", "roof", 1502, 0.3),
  e("roof-sheet-3", "Профлист зелёный", "roof", "roof", 1503, 0.29),
  e("roof-sheet-4", "Профлист красный", "roof", "roof", 1504, 0.28),
  e("roof-sheet-5", "Профлист синий", "roof", "roof", 1505, 0.31),
  // Цвет (5)
  e("color-white-1", "Белый", "color", "color", 1601, 0.8),
  e("color-cream-1", "Кремовый", "color", "color", 1602, 0.75),
  e("color-sage-1", "Шалфей", "color", "color", 1603, 0.7),
  e("color-blue-1", "Синий акцент", "color", "color", 1604, 0.65),
  e("color-terracotta-1", "Терракота", "color", "color", 1605, 0.68),
  // Штукатурка (6)
  e("plaster-fine-1", "Штукатурка тонкая", "plaster", "plaster", 1701, 0.55),
  e("plaster-fine-2", "Штукатурка тёплая", "plaster", "plaster", 1702, 0.52),
  e("plaster-fine-3", "Штукатурка холодная", "plaster", "plaster", 1703, 0.54),
  e("plaster-fine-4", "Штукатурка бежевая", "plaster", "plaster", 1704, 0.56),
  e("plaster-fine-5", "Штукатурка серая", "plaster", "plaster", 1705, 0.53),
  e("plaster-fine-6", "Штукатурка молочная", "plaster", "plaster", 1706, 0.57),
];

const byId = new Map<string, TextureCatalogEntry>();
for (const en of TEXTURE_CATALOG_ENTRIES) {
  byId.set(en.id, en);
}

export function getTextureCatalogEntry(id: string): TextureCatalogEntry | undefined {
  return byId.get(id);
}

export function textureCatalogEntriesForCategory(categoryId: string): readonly TextureCatalogEntry[] {
  return TEXTURE_CATALOG_ENTRIES.filter((x) => x.categoryId === categoryId);
}
