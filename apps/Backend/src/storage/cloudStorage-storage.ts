import { prisma as db } from "@repo/db/client";
import { CloudFolder, CloudFile } from "@repo/db/types";
import { serializeFile } from "../utils/prismaFileUtils";

/**
 * Cloud storage implementation
 *
 * - Clear, self-describing method names
 * - Folder timestamp propagation helper: updateFolderTimestampsRecursively
 * - File upload lifecycle: initializeFileUpload -> appendFileChunk -> finalizeFileUpload
 */

/* ------------------------------- Helpers ------------------------------- */
async function updateFolderTimestampsRecursively(folderId: number | null) {
  if (folderId == null) return;
  let currentId: number | null = folderId;
  const MAX_DEPTH = 50;
  let depth = 0;

  while (currentId != null && depth < MAX_DEPTH) {
    depth += 1;
    try {
      // touch updatedAt and fetch parentId
      const row = (await db.cloudFolder.update({
        where: { id: currentId },
        data: { updatedAt: new Date() },
        select: { parentId: true },
      })) as { parentId: number | null };

      currentId = row.parentId ?? null;
    } catch (err: any) {
      // Stop walking if folder removed concurrently (Prisma P2025)
      if (err?.code === "P2025") break;
      throw err;
    }
  }
}

/* ------------------------------- IStorage ------------------------------- */
export interface IStorage {
  // Folders
  getFolder(id: number): Promise<CloudFolder | null>;
  listFoldersByParent(
    parentId: number | null,
    limit: number,
    offset: number
  ): Promise<CloudFolder[]>;
  countFoldersByParent(parentId: number | null): Promise<number>;
  listRecentFolders(limit: number, offset: number): Promise<CloudFolder[]>;
  createFolder(
    userId: number,
    name: string,
    parentId?: number | null
  ): Promise<CloudFolder>;
  updateFolder(
    id: number,
    updates: Partial<{ name?: string; parentId?: number | null }>
  ): Promise<CloudFolder | null>;
  deleteFolder(id: number): Promise<boolean>;
  countFolders(filter?: {
    userId?: number;
    nameContains?: string | null;
  }): Promise<number>;

  // Files
  getFile(id: number): Promise<CloudFile | null>;
  listFilesInFolder(
    folderId: number | null,
    limit: number,
    offset: number
  ): Promise<CloudFile[]>;
  initializeFileUpload(
    userId: number,
    name: string,
    mimeType?: string | null,
    expectedSize?: bigint | null,
    totalChunks?: number | null,
    folderId?: number | null
  ): Promise<CloudFile>;
  appendFileChunk(fileId: number, seq: number, data: Buffer): Promise<void>;
  finalizeFileUpload(fileId: number): Promise<{ ok: true; size: string }>;
  deleteFile(fileId: number): Promise<boolean>;
  updateFile(
    id: number,
    updates: Partial<Pick<CloudFile, "name" | "mimeType" | "folderId">>
  ): Promise<CloudFile | null>;
  renameFile(id: number, name: string): Promise<CloudFile | null>;
  countFilesInFolder(folderId: number | null): Promise<number>;
  countFiles(filter?: {
    userId?: number;
    nameContains?: string | null;
    mimeType?: string | null;
  }): Promise<number>;

  // Search
  searchFolders(
    q: string,
    limit: number,
    offset: number
  ): Promise<{ data: CloudFolder[]; total: number }>;
  searchFiles(
    q: string,
    type: string | undefined,
    limit: number,
    offset: number
  ): Promise<{ data: CloudFile[]; total: number }>;

  // Streaming
  streamFileTo(resStream: NodeJS.WritableStream, fileId: number): Promise<void>;
}

/* ------------------------------- Implementation ------------------------------- */
export const cloudStorage: IStorage = {
  // --- FOLDERS ---
  async getFolder(id: number) {
    const folder = await db.cloudFolder.findUnique({
      where: { id },
      include: { files: false },
    });
    return (folder as unknown as CloudFolder) ?? null;
  },

  async listFoldersByParent(
    parentId: number | null = null,
    limit = 50,
    offset = 0
  ) {
    const folders = await db.cloudFolder.findMany({
      where: { parentId },
      orderBy: { name: "asc" },
      skip: offset,
      take: limit,
    });
    return folders as unknown as CloudFolder[];
  },

  async countFoldersByParent(parentId: number | null = null) {
    return db.cloudFolder.count({ where: { parentId } });
  },

  async listRecentFolders(limit = 50, offset = 0) {
    const folders = await db.cloudFolder.findMany({
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    });
    return folders as unknown as CloudFolder[];
  },

  async createFolder(
    userId: number,
    name: string,
    parentId: number | null = null
  ) {
    const created = await db.cloudFolder.create({
      data: { userId, name, parentId },
    });
    // mark parent(s) as updated
    await updateFolderTimestampsRecursively(parentId);
    return created as unknown as CloudFolder;
  },

  async updateFolder(
    id: number,
    updates: Partial<{ name?: string; parentId?: number | null }>
  ) {
    try {
      const updated = await db.cloudFolder.update({
        where: { id },
        data: updates,
      });
      if (updates.parentId !== undefined) {
        await updateFolderTimestampsRecursively(updates.parentId ?? null);
      } else {
        // touch this folder's parent (to mark modification)
        const f = await db.cloudFolder.findUnique({
          where: { id },
          select: { parentId: true },
        });
        await updateFolderTimestampsRecursively(f?.parentId ?? null);
      }
      return updated as unknown as CloudFolder;
    } catch (err) {
      throw err;
    }
  },

  async deleteFolder(id: number) {
    try {
      const folder = await db.cloudFolder.findUnique({
        where: { id },
        select: { parentId: true },
      });
      const parentId = folder?.parentId ?? null;
      await db.cloudFolder.delete({ where: { id } });
      await updateFolderTimestampsRecursively(parentId);
      return true;
    } catch (err: any) {
      if (err?.code === "P2025") return false;
      throw err;
    }
  },

  async countFolders(filter?: {
    userId?: number;
    nameContains?: string | null;
  }) {
    const where: any = {};
    if (filter?.userId) where.userId = filter.userId;
    if (filter?.nameContains)
      where.name = { contains: filter.nameContains, mode: "insensitive" };
    return db.cloudFolder.count({ where });
  },

  // --- FILES ---
  async getFile(id: number) {
    const file = await db.cloudFile.findUnique({
      where: { id },
      include: { chunks: { orderBy: { seq: "asc" } } },
    });
    return (file as unknown as CloudFile) ?? null;
  },

  async listFilesInFolder(
    folderId: number | null = null,
    limit = 50,
    offset = 0
  ) {
    const files = await db.cloudFile.findMany({
      where: { folderId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        name: true,
        mimeType: true,
        fileSize: true,
        folderId: true,
        isComplete: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return files.map(serializeFile) as unknown as CloudFile[];
  },

  async initializeFileUpload(
    userId: number,
    name: string,
    mimeType: string | null = null,
    expectedSize: bigint | null = null,
    totalChunks: number | null = null,
    folderId: number | null = null
  ) {
    const created = await db.cloudFile.create({
      data: {
        userId,
        name,
        mimeType,
        fileSize: expectedSize ?? BigInt(0),
        folderId,
        totalChunks,
        isComplete: false,
      },
    });
    await updateFolderTimestampsRecursively(folderId);
    return serializeFile(created) as unknown as CloudFile;
  },

  async appendFileChunk(fileId: number, seq: number, data: Buffer) {
    try {
      await db.cloudFileChunk.create({ data: { fileId, seq, data } });
    } catch (err: any) {
      // idempotent: ignore duplicate chunk constraint
      if (
        err?.code === "P2002" ||
        err?.message?.includes("Unique constraint failed")
      ) {
        return;
      }
      throw err;
    }
  },

  async finalizeFileUpload(fileId: number) {
    const chunks = await db.cloudFileChunk.findMany({ where: { fileId } });
    if (!chunks.length) throw new Error("No chunks uploaded");

    // compute total size
    let total = 0;
    for (const c of chunks) total += c.data.length;

    // transactionally update file and read folderId
    const updated = await db.$transaction(async (tx) => {
      await tx.cloudFile.update({
        where: { id: fileId },
        data: { fileSize: BigInt(total), isComplete: true },
      });
      return tx.cloudFile.findUnique({
        where: { id: fileId },
        select: { folderId: true },
      });
    });

    const folderId = (updated as any)?.folderId ?? null;
    await updateFolderTimestampsRecursively(folderId);

    return { ok: true, size: BigInt(total).toString() };
  },

  async deleteFile(fileId: number) {
    try {
      const file = await db.cloudFile.findUnique({
        where: { id: fileId },
        select: { folderId: true },
      });
      if (!file) return false;
      const folderId = file.folderId ?? null;
      await db.cloudFile.delete({ where: { id: fileId } });
      await updateFolderTimestampsRecursively(folderId);
      return true;
    } catch (err: any) {
      if (err?.code === "P2025") return false;
      throw err;
    }
  },

  async updateFile(
    id: number,
    updates: Partial<Pick<CloudFile, "name" | "mimeType" | "folderId">>
  ) {
    try {
      let prevFolderId: number | null = null;
      if (updates.folderId !== undefined) {
        const f = await db.cloudFile.findUnique({
          where: { id },
          select: { folderId: true },
        });
        prevFolderId = f?.folderId ?? null;
      }

      const updated = await db.cloudFile.update({
        where: { id },
        data: updates,
      });

      // touch affected folders
      if (updates.folderId !== undefined) {
        await updateFolderTimestampsRecursively(updates.folderId ?? null);
        if (
          prevFolderId != null &&
          prevFolderId !== (updates.folderId ?? null)
        ) {
          await updateFolderTimestampsRecursively(prevFolderId);
        }
      } else {
        const f = await db.cloudFile.findUnique({
          where: { id },
          select: { folderId: true },
        });
        await updateFolderTimestampsRecursively(f?.folderId ?? null);
      }

      return serializeFile(updated) as unknown as CloudFile;
    } catch (err) {
      throw err;
    }
  },

  async renameFile(id: number, name: string) {
    try {
      const updated = await db.cloudFile.update({
        where: { id },
        data: { name },
      });
      const f = await db.cloudFile.findUnique({
        where: { id },
        select: { folderId: true },
      });
      await updateFolderTimestampsRecursively(f?.folderId ?? null);
      return serializeFile(updated) as unknown as CloudFile;
    } catch (err) {
      throw err;
    }
  },

  async countFilesInFolder(folderId: number | null) {
    return db.cloudFile.count({ where: { folderId } });
  },

  async countFiles(filter?: {
    userId?: number;
    nameContains?: string | null;
    mimeType?: string | null;
  }) {
    const where: any = {};
    if (filter?.userId) where.userId = filter.userId;
    if (filter?.nameContains)
      where.name = { contains: filter.nameContains, mode: "insensitive" };
    if (filter?.mimeType)
      where.mimeType = { startsWith: filter.mimeType, mode: "insensitive" };
    return db.cloudFile.count({ where });
  },

  // --- SEARCH ---
  async searchFolders(q: string, limit = 20, offset = 0) {
    const [folders, total] = await Promise.all([
      db.cloudFolder.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      db.cloudFolder.count({
        where: { name: { contains: q, mode: "insensitive" } },
      }),
    ]);
    return { data: folders as unknown as CloudFolder[], total };
  },

  async searchFiles(
    q: string,
    type: string | undefined,
    limit = 20,
    offset = 0
  ) {
    const where: any = {};
    if (q) where.name = { contains: q, mode: "insensitive" };
    if (type) {
      if (!type.includes("/"))
        where.mimeType = { startsWith: `${type}/`, mode: "insensitive" };
      else where.mimeType = { startsWith: type, mode: "insensitive" };
    }

    const [files, total] = await Promise.all([
      db.cloudFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          mimeType: true,
          fileSize: true,
          folderId: true,
          isComplete: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.cloudFile.count({ where }),
    ]);

    return { data: files.map(serializeFile) as unknown as CloudFile[], total };
  },

  // --- STREAM ---
  async streamFileTo(resStream: NodeJS.WritableStream, fileId: number) {
    const batchSize = 100;
    let offset = 0;
    while (true) {
      const chunks = await db.cloudFileChunk.findMany({
        where: { fileId },
        orderBy: { seq: "asc" },
        take: batchSize,
        skip: offset,
      });
      if (!chunks.length) break;
      for (const c of chunks) resStream.write(Buffer.from(c.data));
      offset += chunks.length;
      if (chunks.length < batchSize) break;
    }
  },
};

export default cloudStorage;
