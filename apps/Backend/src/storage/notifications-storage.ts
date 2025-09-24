import { Notification, NotificationTypes } from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  // Notification methods
  createNotification(
    userId: number,
    type: NotificationTypes,
    message: string
  ): Promise<Notification>;
  getNotifications(
    userId: number,
    limit?: number,
    offset?: number
  ): Promise<Notification[]>;
  markNotificationRead(
    userId: number,
    notificationId: number
  ): Promise<boolean>;
  markAllNotificationsRead(userId: number): Promise<number>;
  deleteNotificationsByType(
    userId: number,
    type: NotificationTypes
  ): Promise<number>;
  deleteAllNotifications(userId: number): Promise<number>;
}

export const notificationsStorage: IStorage = {
  // ==============================
  // Notification methods
  // ==============================
  async createNotification(userId, type, message) {
    return await db.notification.create({
      data: { userId, type, message },
    });
  },

  async getNotifications(
    userId: number,
    limit = 50,
    offset = 0
  ): Promise<Notification[]> {
    return await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  },

  async markNotificationRead(userId, notificationId) {
    const result = await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    return result.count > 0;
  },

  async markAllNotificationsRead(userId) {
    const result = await db.notification.updateMany({
      where: { userId },
      data: { read: true },
    });
    return result.count;
  },

  async deleteNotificationsByType(userId, type) {
    const result = await db.notification.deleteMany({
      where: { userId, type },
    });
    return result.count;
  },

  async deleteAllNotifications(userId: number): Promise<number> {
    const result = await db.notification.deleteMany({
      where: { userId },
    });
    return result.count;
  },
};
