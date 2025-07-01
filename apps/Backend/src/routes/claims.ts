import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ClaimUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import multer from "multer";
import { forwardToSeleniumAgent } from "../services/seleniumClient";
import path from "path";
import axios from "axios";
import fs from "fs";

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

// Extend the schema to inject `userId` manually (since it's not passed by the client)
const ExtendedClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).extend({
  userId: z.number(),
});

// Routes
const multerStorage = multer.memoryStorage(); // NO DISK
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

router.post(
  "/selenium",
  upload.fields([
    { name: "pdfs", maxCount: 10 },
    { name: "images", maxCount: 10 },
  ]),
  async (req: Request, res: Response): Promise<any> => {
    if (!req.files || !req.body.data) {
      return res
        .status(400)
        .json({ error: "Missing files or claim data for selenium" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: user info missing" });
    }

    try {
      const claimData = JSON.parse(req.body.data);
      const pdfs =
        (req.files as Record<string, Express.Multer.File[]>).pdfs ?? [];
      const images =
        (req.files as Record<string, Express.Multer.File[]>).images ?? [];

      const credentials = await storage.getInsuranceCredentialByUserAndSiteKey(
        req.user.id,
        claimData.insuranceSiteKey
      );
      if (!credentials) {
        return res
          .status(404)
          .json({ error: "No insurance credentials found for this provider." });
      }

      const enrichedData = {
        ...claimData,
        massdhpUsername: credentials.username,
        massdhpPassword: credentials.password,
      };

      const result = await forwardToSeleniumAgent(enrichedData, [
        ...pdfs,
        ...images,
      ]);

      res.json(result);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        error: err.message || "Failed to forward to selenium agent",
      });
    }
  }
);

router.post(
  "/selenium/fetchpdf",
  async (req: Request, res: Response): Promise<any> => {
    function sendError(res: Response, message: string, status = 400) {
      console.error("Error:", message);
      return res.status(status).json({ error: message });
    }

    try {
      if (!req.user || !req.user.id) {
        return sendError(res, "Unauthorized: user info missing", 401);
      }

      const { patientId, claimId, pdf_url } = req.body;

      if (!pdf_url) {
        return sendError(res, "Missing pdf_url");
      }

      if (!patientId) {
        return sendError(res, "Missing Patient Id");
      }
      if (!claimId) {
        return sendError(res, "Missing Claim Id");
      }

      const parsedPatientId = parseInt(patientId);
      const parsedClaimId = parseInt(claimId);

      const filename = path.basename(new URL(pdf_url).pathname);
      const pdfResponse = await axios.get(pdf_url, {
        responseType: "arraybuffer",
      });

      // Temp savving the pdf incase, creatClaimPdf failed:
      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const filePath = path.join(tempDir, filename);
      fs.writeFileSync(filePath, pdfResponse.data);

      // saving at postgres db
      await storage.createClaimPdf(
        parsedPatientId,
        parsedClaimId,
        filename,
        pdfResponse.data
      );

      return res.json({
        success: true,
        pdfPath: `/temp/${filename}`,
        pdf_url,
        fileName: filename,
      });
    } catch (err) {
      console.error("Error in /selenium/fetchpdf:", err);
      return sendError(res, "Failed to Fetch and Download the pdf", 500);
    }
  }
);

// GET /api/claims?page=1&limit=5
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const offset = parseInt(req.query.offset as string) || 0;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    const [claims, total] = await Promise.all([
      storage.getClaimsPaginated(userId, offset, limit),
      storage.countClaimsByUserId(userId),
    ]);

    res.json({
      data: claims,
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve paginated claims" });
  }
});

// GET /api/claims/recent
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const claims = await storage.getClaimsMetadataByUser(req.user!.id);
    res.json(claims); // Just ID and createdAt
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve recent claims" });
  }
});

// Get all claims for the logged-in user
router.get("/all", async (req: Request, res: Response) => {
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
    if (Array.isArray(req.body.serviceLines)) {
      req.body.serviceLines = { create: req.body.serviceLines };
    }

    const parsedClaim = ExtendedClaimSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    const newClaim = await storage.createClaim(parsedClaim);
    res.status(201).json(newClaim);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.format(),
      });
    }

    console.error("❌ Failed to create claim:", error); // logs full error to server

    // Send more detailed info to the client (for dev only)
    return res.status(500).json({
      message: "Failed to create claim",
      error: error instanceof Error ? error.message : String(error),
    });
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
