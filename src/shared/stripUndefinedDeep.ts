/**
 * Firestore не допускает `undefined` в значениях полей. Удаляет ключи с `undefined`
 * в произвольном JSON-подобном дереве (объекты, массивы).
 */
export function stripUndefinedDeep<T>(input: T): T {
  if (input === undefined || input === null) {
    return input;
  }
  if (typeof input !== "object") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((x) => stripUndefinedDeep(x)) as T;
  }
  if (input instanceof Date) {
    return input;
  }
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) {
      continue;
    }
    out[k] = stripUndefinedDeep(v);
  }
  return out as T;
}
