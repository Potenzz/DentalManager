import { DatabaseBackup, BackupDestination } from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  // Database Backup methods
  createBackup(userId: number): Promise<DatabaseBackup>;
  getLastBackup(userId: number): Promise<DatabaseBackup | null>;
  getBackups(userId: number, limit?: number): Promise<DatabaseBackup[]>;
  deleteBackups(userId: number): Promise<number>; // clears all for user

  // ==============================
  // Backup Destination methods
  // ==============================
  createBackupDestination(
    userId: number,
    path: string
  ): Promise<BackupDestination>;

  getActiveBackupDestination(
    userId: number
  ): Promise<BackupDestination | null>;

  getAllBackupDestination(
    userId: number
  ): Promise<BackupDestination[]>;

  updateBackupDestination(
    id: number,
    userId: number,
    path: string
  ): Promise<BackupDestination>;

  deleteBackupDestination(
    id: number,
    userId: number
  ): Promise<BackupDestination>;
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

  // ==============================
  // Backup Destination methods
  // ==============================
  async createBackupDestination(userId, path) {
    // deactivate existing destination
    await db.backupDestination.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    return db.backupDestination.create({
      data: { userId, path },
    });
  },

  async getActiveBackupDestination(userId) {
    return db.backupDestination.findFirst({
      where: { userId, isActive: true },
    });
  },

  async getAllBackupDestination(userId) {
    return db.backupDestination.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateBackupDestination(id, userId, path) {
    // optional: make this one active
    await db.backupDestination.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    return db.backupDestination.update({
      where: { id, userId },
      data: { path, isActive: true },
    });
  },

  async deleteBackupDestination(id, userId) {
    return db.backupDestination.delete({
      where: { id, userId },
    });
  },
};