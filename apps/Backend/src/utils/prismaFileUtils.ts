/**
 * Helper: convert Prisma CloudFile result to JSON-friendly object.
 */
export function serializeFile(f: any) {
  if (!f) return null;
  return {
    ...f,
    fileSize: typeof f.fileSize === "bigint" ? f.fileSize.toString() : f.fileSize,
    createdAt: f.createdAt?.toISOString?.(),
    updatedAt: f.updatedAt?.toISOString?.(),
  };
}
