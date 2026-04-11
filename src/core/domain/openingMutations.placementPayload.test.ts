import { describe, expect, it } from "vitest";

import type { Opening } from "./opening";
import {
  placedDoorOpeningToDraftPayload,
  placedWindowOpeningToDraftPayload,
} from "./openingMutations";
import {
  DEFAULT_SILL_OVERHANG_MM,
  DEFAULT_VIEW_PRESET_KEY,
  DEFAULT_WINDOW_FORM_KEY,
} from "./windowFormCatalog";

describe("placedWindowOpeningToDraftPayload", () => {
  it("восстанавливает payload для липкой вставки", () => {
    const o: Opening = {
      id: "w1",
      wallId: "wall1",
      kind: "window",
      offsetFromStartMm: 100,
      widthMm: 900,
      heightMm: 2100,
      formKey: DEFAULT_WINDOW_FORM_KEY,
      formName: "Прямоугольник",
      viewPreset: "form3",
      sillOverhangMm: 60,
      isEmptyOpening: true,
    };
    expect(placedWindowOpeningToDraftPayload(o)).toEqual({
      formKey: DEFAULT_WINDOW_FORM_KEY,
      widthMm: 900,
      heightMm: 2100,
      viewPreset: "form3",
      sillOverhangMm: 60,
      isEmptyOpening: true,
    });
  });

  it("подставляет дефолты для необязательных полей", () => {
    const o: Opening = {
      id: "w1",
      wallId: "wall1",
      kind: "window",
      offsetFromStartMm: 0,
      widthMm: 800,
      heightMm: 1200,
    };
    expect(placedWindowOpeningToDraftPayload(o)).toEqual({
      formKey: DEFAULT_WINDOW_FORM_KEY,
      widthMm: 800,
      heightMm: 1200,
      viewPreset: DEFAULT_VIEW_PRESET_KEY,
      sillOverhangMm: DEFAULT_SILL_OVERHANG_MM,
      isEmptyOpening: false,
    });
  });

  it("возвращает null для двери", () => {
    const o: Opening = {
      id: "d1",
      wallId: "wall1",
      kind: "door",
      offsetFromStartMm: 0,
      widthMm: 900,
      heightMm: 2100,
    };
    expect(placedWindowOpeningToDraftPayload(o)).toBeNull();
  });
});

describe("placedDoorOpeningToDraftPayload", () => {
  it("восстанавливает payload с открыванием", () => {
    const o: Opening = {
      id: "d1",
      wallId: "wall1",
      kind: "door",
      offsetFromStartMm: 0,
      widthMm: 900,
      heightMm: 2100,
      doorType: "single",
      doorSwing: "out_left",
      doorTrimMm: 40,
      isEmptyOpening: false,
    };
    expect(placedDoorOpeningToDraftPayload(o)).toEqual({
      widthMm: 900,
      heightMm: 2100,
      isEmptyOpening: false,
      doorType: "single",
      doorSwing: "out_left",
      doorTrimMm: 40,
    });
  });

  it("возвращает null для окна", () => {
    const o: Opening = {
      id: "w1",
      wallId: "wall1",
      kind: "window",
      offsetFromStartMm: 0,
      widthMm: 900,
      heightMm: 2100,
    };
    expect(placedDoorOpeningToDraftPayload(o)).toBeNull();
  });
});
