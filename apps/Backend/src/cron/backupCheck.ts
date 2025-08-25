import cron from "node-cron";
import { storage } from "../storage";
import { NotificationTypes } from "@repo/db/types";

/**
 * Daily cron job to check if users haven't backed up in 7 days
 * Creates a backup notification if overdue
 */
export const startBackupCron = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("🔄 Running daily backup check...");

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
          const lastBackup = await storage.getLastBackup(user.id);
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
