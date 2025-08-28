import express, { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  insertInsuranceCredentialSchema,
  InsuranceCredential,
} from "@repo/db/types";

const router = express.Router();

// ✅ Get all credentials for a user
router.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: user info missing" });
    }
    const userId = req.user.id;

    const credentials = await storage.getInsuranceCredentialsByUser(userId);
    return res.status(200).json(credentials);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch credentials", details: String(err) });
  }
});

// ✅ Create credential for a user
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: user info missing" });
    }
    const userId = req.user.id;

    const parseResult = insertInsuranceCredentialSchema.safeParse({
      ...req.body,
      userId,
    });
    if (!parseResult.success) {
      const flat = (
        parseResult as typeof parseResult & { error: z.ZodError<any> }
      ).error.flatten();
      const firstError =
        Object.values(flat.fieldErrors)[0]?.[0] || "Invalid input";

      return res.status(400).json({
        message: firstError,
        details: flat.fieldErrors,
      });
    }

    const credential = await storage.createInsuranceCredential(
      parseResult.data
    );
    return res.status(201).json(credential);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({
        message: `Credential with this ${err.meta?.target?.join(", ")} already exists.`,
      });
    }
    return res
      .status(500)
      .json({ error: "Failed to create credential", details: String(err) });
  }
});

// ✅ Update credential
router.put("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).send("Invalid credential ID");

    const updates = req.body as Partial<InsuranceCredential>;
    const credential = await storage.updateInsuranceCredential(id, updates);
    return res.status(200).json(credential);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to update credential", details: String(err) });
  }
});

// ✅ Delete a credential
router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).send("Invalid ID");

    // 1) Check existence
    const existing = await storage.getInsuranceCredential(userId);
    if (!existing)
      return res.status(404).json({ message: "Credential not found" });

    // 2) Ownership check
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Not your credential" });
    }

    // 3) Delete (storage method enforces userId + id)
    const ok = await storage.deleteInsuranceCredential(userId, id);
    if (!ok) {
      return res
        .status(404)
        .json({ message: "Credential not found or already deleted" });
    }
    return res.status(204).send();
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to delete credential", details: String(err) });
  }
});

export default router;
