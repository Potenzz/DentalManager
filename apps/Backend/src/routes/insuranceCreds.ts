import express, { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { InsuranceCredentialUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

const router = express.Router();

// ✅ Types
type InsuranceCredential = z.infer<typeof InsuranceCredentialUncheckedCreateInputObjectSchema>;

const insertInsuranceCredentialSchema = (
  InsuranceCredentialUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({ id: true });

type InsertInsuranceCredential = z.infer<typeof insertInsuranceCredentialSchema>;

// ✅ Get all credentials for a user
router.get("/", async (req: Request, res: Response):Promise<any> => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: user info missing" });
    }
    const userId = req.user.id;

    const credentials = await storage.getInsuranceCredentialsByUser(userId);
    return res.status(200).json(credentials);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch credentials", details: String(err) });
  }
});

// ✅ Create credential for a user
router.post("/", async (req: Request, res: Response):Promise<any> => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: user info missing" });
    }
    const userId = req.user.id;

    const parseResult = insertInsuranceCredentialSchema.safeParse({ ...req.body, userId });
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const credential = await storage.createInsuranceCredential(parseResult.data);
    return res.status(201).json(credential);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create credential", details: String(err) });
  }
});

// ✅ Update credential
router.put("/:id", async (req: Request, res: Response):Promise<any> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).send("Invalid credential ID");

    const updates = req.body as Partial<InsuranceCredential>;
    const credential = await storage.updateInsuranceCredential(id, updates);
    return res.status(200).json(credential);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update credential", details: String(err) });
  }
});

// ✅ Delete a credential
router.delete("/:id", async (req: Request, res: Response):Promise<any> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).send("Invalid ID");

    await storage.deleteInsuranceCredential(id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete credential", details: String(err) });
  }
});

export default router;
