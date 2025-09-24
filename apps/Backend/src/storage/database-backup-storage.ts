import { DatabaseBackup } from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  // Database Backup methods
  createBackup(userId: number): Promise<DatabaseBackup>;
  getLastBackup(userId: number): Promise<DatabaseBackup | null>;
  getBackups(userId: number, limit?: number): Promise<DatabaseBackup[]>;
  deleteBackups(userId: number): Promise<number>; // clears all for user
}

export const databaseBackupStorage: IStorage = {
  // ==============================
  // Database Backup methods
  // ==============================
  async createBackup(userId) {
    return await db.databaseBackup.create({ data: { userId } });
  },

  async getLastBackup(userId) {
    return await db.databaseBackup.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getBackups(userId, limit = 10) {
    return await db.databaseBackup.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async deleteBackups(userId) {
    const result = await db.databaseBackup.deleteMany({ where: { userId } });
    return result.count;
  },
};
