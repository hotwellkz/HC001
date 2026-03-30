import { describe, expect, it } from "vitest";

import { stripUndefinedDeep } from "./stripUndefinedDeep";

describe("stripUndefinedDeep", () => {
  it("удаляет undefined из вложенных объектов", () => {
    const input = {
      a: 1,
      b: undefined,
      c: { d: 2, e: undefined, f: [{ x: 1, y: undefined }] },
    };
    expect(stripUndefinedDeep(input)).toEqual({
      a: 1,
      c: { d: 2, f: [{ x: 1 }] },
    });
  });
});
