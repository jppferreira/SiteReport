export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? readonly U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/** Nested merge: patch objects recurse; primitives/arrays from patch win. */
export function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === undefined) return base;
  if (Array.isArray(base) || Array.isArray(patch) || typeof base !== 'object' || base === null) {
    return patch as T;
  }
  const result = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = result[key];
    result[key] =
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
        ? deepMerge(current, value as DeepPartial<typeof current>)
        : value;
  }
  return result as T;
}
