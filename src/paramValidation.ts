import { z } from "zod";

// This signature might be a bit overkill but these are the types
// z.literal allows.
export function oneOf<
  T extends string | number | boolean | bigint | null | undefined,
>(t: readonly [T, T, ...T[]]) {
  // A union must have at least 2 elements so to work with the types it
  // must be instantiated in this way.
  return z.union([
    z.literal(t[0]),
    z.literal(t[1]),
    // No pointfree here because `z.literal` takes an optional second parameter
    ...t.slice(2).map((v) => z.literal(v)),
  ]);
}
