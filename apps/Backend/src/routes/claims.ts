import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  ClaimUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";

const router = Router();

// Define Zod schemas
const ClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

type InsertClaim = z.infer<typeof ClaimSchema>;

const updateClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

type UpdateClaim = z.infer<typeof updateClaimSchema>;

// Routes

// Get all claims for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  try {
    const claims = await storage.getClaimsByUserId(req.user!.id);
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve claims" });
  }
});

// Get a single claim by ID
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
    return res.status(400).json({ error: "Missing claim ID" });
    }
    const claimId = parseInt(idParam, 10);
    if (isNaN(claimId)) {
    return res.status(400).json({ error: "Invalid claim ID" });
    }

    const claim = await storage.getClaim(claimId);
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    if (claim.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve claim" });
  }
});

// Create a new claim
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const claimData = ClaimSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    const newClaim = await storage.createClaim(claimData);
    res.status(201).json(newClaim);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.format(),
      });
    }
    res.status(500).json({ message: "Failed to create claim" });
  }
});

// Update a claim
router.put("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
    return res.status(400).json({ error: "Missing claim ID" });
    }

    const claimId = parseInt(idParam, 10);
    if (isNaN(claimId)) {
    return res.status(400).json({ error: "Invalid claim ID" });
    }

    const existingClaim = await storage.getClaim(claimId);
    if (!existingClaim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    if (existingClaim.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const claimData = updateClaimSchema.parse(req.body);
    const updatedClaim = await storage.updateClaim(claimId, claimData);
    res.json(updatedClaim);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.format(),
      });
    }
    res.status(500).json({ message: "Failed to update claim" });
  }
});

// Delete a claim
router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
    return res.status(400).json({ error: "Missing claim ID" });
    }

    const claimId = parseInt(idParam, 10);
    if (isNaN(claimId)) {
    return res.status(400).json({ error: "Invalid claim ID" });
    }

    const existingClaim = await storage.getClaim(claimId);
    if (!existingClaim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    if (existingClaim.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await storage.deleteClaim(claimId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete claim" });
  }
});

export default router;
