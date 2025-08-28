import { Router, Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await storage.getNotifications(userId, 20, 0);
    res.json(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark one notification as read
router.post("/:id/read", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const success = await storage.markNotificationRead(
      userId,
      Number(req.params.id)
    );

    if (!success)
      return res.status(404).json({ message: "Notification not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.post("/read-all", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const count = await storage.markAllNotificationsRead(userId);
    res.json({ success: true, updatedCount: count });
  } catch (err) {
    console.error("Failed to mark all notifications read:", err);
    res.status(500).json({ message: "Failed to mark all notifications read" });
  }
});

router.delete(
  "/delete-all",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const deletedCount = await storage.deleteAllNotifications(userId);
      res.json({ success: true, deletedCount });
    } catch (err) {
      console.error("Failed to delete notifications:", err);
      res.status(500).json({ message: "Failed to delete notifications" });
    }
  }
);

export default router;
