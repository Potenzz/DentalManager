import cron from "node-cron";
import fs from "fs";
import { storage } from "../storage";
import { NotificationTypes } from "@repo/db/types";
import { backupDatabaseToPath } from "../services/databaseBackupService";

/**
 * Daily cron job to check if users haven't backed up in 7 days
 * Creates a backup notification if overdue
 */
export const startBackupCron = () => {
  cron.schedule("0 22 * * *", async () => {
    // Every calendar days, at 10 PM
    // cron.schedule("*/10 * * * * *", async () => { // Every 10 seconds (for Test)

    console.log("🔄 Running backup check...");

    const userBatchSize = 100;
    let userOffset = 0;

    while (true) {
      // Fetch a batch of users
      const users = await storage.getUsers(userBatchSize, userOffset);
      if (!users || users.length === 0) break;

      for (const user of users) {
        try {
          if (user.id == null) {
            continue;
          }

          const destination = await storage.getActiveBackupDestination(user.id);
          const lastBackup = await storage.getLastBackup(user.id);

          // ==============================
          // CASE 1: Destination exists → auto backup
          // ==============================
          if (destination) {
            if (!fs.existsSync(destination.path)) {
              await storage.createNotification(
                user.id,
                "BACKUP",
                "❌ Automatic backup failed: external drive not connected."
              );
              continue;
            }

            try {
              const filename = `dental_backup_${Date.now()}.zip`;

              await backupDatabaseToPath({
                destinationPath: destination.path,
                filename,
              });

              await storage.createBackup(user.id);
              await storage.deleteNotificationsByType(user.id, "BACKUP");

              console.log(`✅ Auto backup successful for user ${user.id}`);
              continue;
            } catch (err) {
              console.error(`Auto backup failed for user ${user.id}`, err);

              await storage.createNotification(
                user.id,
                "BACKUP",
                "❌ Automatic backup failed. Please check your backup destination."
              );
              continue;
            }
          }

          // ==============================
          // CASE 2: No destination → fallback to reminder
          // ==============================

          const daysSince = lastBackup?.createdAt
            ? (Date.now() - new Date(lastBackup.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
            : Infinity;

          if (daysSince >= 7) {
            await storage.createNotification(
              user.id,
              "BACKUP" as NotificationTypes,
              "⚠️ It has been more than 7 days since your last backup."
            );
            console.log(`Notification created for user ${user.id}`);
          }
        } catch (err) {
          console.error(`Error processing user ${user.id}:`, err);
        }
      }

      userOffset += userBatchSize; // next user batch
    }

    console.log("✅ Daily backup check completed.");
  });
};
