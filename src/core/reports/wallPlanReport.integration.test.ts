import { describe, expect, it } from "vitest";

import { createDemoProject } from "../domain/demoProject";
import { compileReport } from "./compileReport";
import { getReportDefinition } from "./registry";

describe("wall_plan compileReport", () => {
  it("собирает модель без ошибок для демо-проекта", () => {
    const p = createDemoProject();
    const def = getReportDefinition("wall_plan");
    expect(def).toBeDefined();
    const model = compileReport(p, def!, {
      scaleDenominator: 100,
      reportDateIso: new Date().toISOString(),
      sheetIndex: 1,
      sheetCount: 1,
    });
    expect(model.primitives.length).toBeGreaterThan(5);
    expect(model.messages.length).toBeGreaterThanOrEqual(0);
  });
});
