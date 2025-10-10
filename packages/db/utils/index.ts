/**
 * Extract enum values from a Zod enum or native enum schema.
 * Supports z.enum([...]) and z.nativeEnum(SomeTsEnum).
 */
export function extractEnumValues<T extends string | number>(schema: any): T[] {
  // z.enum([...]) => schema.options exists
  if (Array.isArray(schema?.options)) {
    return schema.options as T[];
  }

  // z.nativeEnum(SomeEnum) => schema._def?.values may exist or enum is in schema._def?.enum
  if (Array.isArray(schema?._def?.values)) {
    return schema._def.values as T[];
  }

  if (schema?._def?.enum) {
    // enum object -> values
    return Object.values(schema._def.enum) as T[];
  }

  throw new Error("Unsupported Zod schema type for enum extraction");
}

/**
 * Build a runtime map: { VAL: "VAL", ... } with proper typing
 * so callers can import paymentStatusOptions.VOID etc.
 */
export function makeEnumOptions<T extends string | number>(schema: any) {
  const values = extractEnumValues<T>(schema);
  const map = {} as Record<string, T>;
  values.forEach((v) => {
    map[String(v)] = v;
  });
  return map as { [K in T & (string | number)]: K };
}
