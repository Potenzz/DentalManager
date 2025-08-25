import { Router, Request, Response } from "express";
import { prisma } from "@repo/db/client";

const router = Router();

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(notifications);
});

router.post("/:id/read", async (req, res) => {
  const userId = (req as any).user?.id;
  await prisma.notification.updateMany({
    where: { id: Number(req.params.id), userId },
    data: { read: true },
  });
  res.json({ success: true });
});

router.post("/read-all", async (req, res) => {
  const userId = (req as any).user?.id;
  await prisma.notification.updateMany({
    where: { userId },
    data: { read: true },
  });
  res.json({ success: true });
});

export default router;
