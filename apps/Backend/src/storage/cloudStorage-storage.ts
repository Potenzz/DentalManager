import { prisma as db } from "@repo/db/client";
import { CloudFile, CloudFolder } from "@repo/db/types";
import { serializeFile } from "../utils/prismaFileUtils";

export interface IStorage {
  // CloudFolder methods
  getFolder(id: number): Promise<CloudFolder | null>;
  getFoldersByUser(
    userId: number,
    parentId: number | null,
    limit: number,
    offset: number
  ): Promise<CloudFolder[]>;
  getRecentFolders(limit: number, offset: number): Promise<CloudFolder[]>;
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

  // CloudFile methods
  getFile(id: number): Promise<CloudFile | null>;
  listFilesByFolderByUser(
    userId: number,
    folderId: number | null,
    limit: number,
    offset: number
  ): Promise<CloudFile[]>;
  listFilesByFolder(
    folderId: number | null,
    limit: number,
    offset: number
  ): Promise<CloudFile[]>;

  // chunked upload methods
  createFileInit(
    userId: number,
    name: string,
    mimeType?: string | null,
    expectedSize?: bigint | null,
    totalChunks?: number | null,
    folderId?: number | null
  ): Promise<CloudFile>;
  addChunk(fileId: number, seq: number, data: Buffer): Promise<void>;
  completeFile(fileId: number): Promise<{ ok: true; size: string }>;
  deleteFile(fileId: number): Promise<boolean>;

  // search
  searchByName(
    userId: number,
    q: string,
    limit: number,
    offset: number
  ): Promise<{
    folders: CloudFolder[];
    files: CloudFile[];
    foldersTotal: number;
    filesTotal: number;
  }>;

  // helper: stream file chunks via Node.js stream
  streamFileTo(resStream: NodeJS.WritableStream, fileId: number): Promise<void>;
}

export const cloudStorageStorage: IStorage = {
  // --- Folders ---
  async getFolder(id: number) {
    const folder = await db.cloudFolder.findUnique({
      where: { id },
      include: { files: false },
    });
    return folder ?? null;
  },

  async getFoldersByUser(
    userId: number,
    parentId: number | null = null,
    limit = 50,
    offset = 0
  ) {
    const folders = await db.cloudFolder.findMany({
      where: { userId, parentId },
      orderBy: { name: "asc" },
      skip: offset,
      take: limit,
    });
    return folders;
  },

  async getRecentFolders(limit = 50, offset = 0) {
    const folders = await db.cloudFolder.findMany({
      orderBy: { name: "asc" },
      skip: offset,
      take: limit,
    });
    return folders;
  },

  async createFolder(
    userId: number,
    name: string,
    parentId: number | null = null
  ) {
    const created = await db.cloudFolder.create({
      data: { userId, name, parentId },
    });
    return created;
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
      return updated;
    } catch (err) {
      return null;
    }
  },

  async deleteFolder(id: number) {
    try {
      await db.cloudFolder.delete({ where: { id } });
      return true;
    } catch (err) {
      console.error("deleteFolder error", err);
      return false;
    }
  },

  // --- Files ---
  async getFile(id: number): Promise<CloudFile | null> {
    const file = await db.cloudFile.findUnique({
      where: { id },
      include: { chunks: { orderBy: { seq: "asc" } } },
    });
    return (file as unknown as CloudFile) ?? null;
  },

  async listFilesByFolderByUser(
    userId: number,
    folderId: number | null = null,
    limit = 50,
    offset = 0
  ) {
    const files = await db.cloudFile.findMany({
      where: { userId, folderId },
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
    return files.map(serializeFile);
  },

  async listFilesByFolder(
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
    return files.map(serializeFile);
  },

  // --- Chunked upload methods ---
  async createFileInit(
    userId,
    name,
    mimeType = null,
    expectedSize = null,
    totalChunks = null,
    folderId = null
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
    return serializeFile(created);
  },

  async addChunk(fileId: number, seq: number, data: Buffer) {
    // Ensure file exists & belongs to owner will be done by caller (route)
    // Attempt insert; if unique violation => ignore (idempotent)
    try {
      await db.cloudFileChunk.create({
        data: {
          fileId,
          seq,
          data,
        },
      });
    } catch (err: any) {
      // If unique constraint violation (duplicate chunk), ignore
      if (
        err?.code === "P2002" ||
        err?.message?.includes("Unique constraint failed")
      ) {
        // duplicate chunk, ignore
        return;
      }
      throw err;
    }
  },

  async completeFile(fileId: number) {
    // Compute total size from chunks and mark complete inside a transaction
    const chunks = await db.cloudFileChunk.findMany({ where: { fileId } });
    if (!chunks.length) {
      throw new Error("No chunks uploaded");
    }
    let total = 0;
    for (const c of chunks) total += c.data.length;

    // Update file
    await db.cloudFile.update({
      where: { id: fileId },
      data: {
        fileSize: BigInt(total),
        isComplete: true,
      },
    });
    return { ok: true, size: BigInt(total).toString() };
  },

  async deleteFile(fileId: number) {
    try {
      await db.cloudFile.delete({ where: { id: fileId } });
      // chunks cascade-delete via Prisma relation onDelete: Cascade
      return true;
    } catch (err) {
      console.error("deleteFile error", err);
      return false;
    }
  },

  // --- Search ---
  async searchByName(userId: number, q: string, limit = 20, offset = 0) {
    const [folders, files, foldersTotal, filesTotal] = await Promise.all([
      db.cloudFolder.findMany({
        where: {
          userId,
          name: { contains: q, mode: "insensitive" },
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      db.cloudFile.findMany({
        where: {
          userId,
          name: { contains: q, mode: "insensitive" },
        },
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
      db.cloudFolder.count({
        where: {
          userId,
          name: { contains: q, mode: "insensitive" },
        },
      }),
      db.cloudFile.count({
        where: {
          userId,
          name: { contains: q, mode: "insensitive" },
        },
      }),
    ]);
    return {
      folders,
      files: files.map(serializeFile),
      foldersTotal,
      filesTotal,
    };
  },

  // --- Streaming helper ---
  async streamFileTo(resStream: NodeJS.WritableStream, fileId: number) {
    // Stream chunks in batches to avoid loading everything at once.
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
      for (const c of chunks) {
        resStream.write(Buffer.from(c.data));
      }
      offset += chunks.length;
      if (chunks.length < batchSize) break;
    }
    // caller will end the response stream
  },
};
