import { describe, expect, it } from "vitest";

import { getTextureCatalogEntry, textureCatalogEntriesForCategory, TEXTURE_CATALOG_CATEGORIES } from "./textureCatalog";

describe("textureCatalog: OSB", () => {
  it("есть категория Плиты", () => {
    expect(TEXTURE_CATALOG_CATEGORIES.some((c) => c.id === "panels" && c.labelRu === "Плиты")).toBe(true);
  });

  it("panel-osb-1 — OSB, процедурный вид osb, разумный defaultScaleM", () => {
    const en = getTextureCatalogEntry("panel-osb-1");
    expect(en).toBeDefined();
    expect(en!.name).toBe("OSB");
    expect(en!.categoryId).toBe("panels");
    expect(en!.procedural.kind).toBe("osb");
    expect(en!.procedural.seed).toBe(1801);
    expect(en!.defaultScaleM).toBe(0.64);
  });

  it("категория panels содержит OSB", () => {
    const list = textureCatalogEntriesForCategory("panels");
    expect(list.map((x) => x.id)).toContain("panel-osb-1");
  });
});
