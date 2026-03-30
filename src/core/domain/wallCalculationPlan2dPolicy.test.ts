import { describe, expect, it } from "vitest";

import {
  isLumberRoleDrawnInPlan2d,
  isLumberRoleLabeledInPlan2d,
  isLumberRoleVisibleInPlan2d,
} from "./wallCalculationPlan2dPolicy";

describe("wallCalculationPlan2dPolicy", () => {
  it("на плане 2D рисуются все расчётные доски внутри стены", () => {
    expect(isLumberRoleDrawnInPlan2d("joint_board")).toBe(true);
    expect(isLumberRoleDrawnInPlan2d("sip_joint_vertical")).toBe(true);
    expect(isLumberRoleDrawnInPlan2d("upper_plate")).toBe(true);
    expect(isLumberRoleDrawnInPlan2d("lower_plate")).toBe(true);
    expect(isLumberRoleDrawnInPlan2d("edge_board")).toBe(true);
    expect(isLumberRoleDrawnInPlan2d("plate_top")).toBe(true); // легаси → upper_plate
    expect(isLumberRoleDrawnInPlan2d("opening_header")).toBe(true);
    expect(isLumberRoleDrawnInPlan2d("tee_joint_board")).toBe(true);
  });
  it("подписи допустимы для тех же ролей, что и заливка (видимость регулирует label policy)", () => {
    expect(isLumberRoleLabeledInPlan2d("joint_board")).toBe(true);
    expect(isLumberRoleLabeledInPlan2d("upper_plate")).toBe(true);
    expect(isLumberRoleVisibleInPlan2d("upper_plate")).toBe(true);
  });
});
