import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import multer from "multer";
import { forwardToSeleniumClaimAgent } from "../services/seleniumClaimClient";
import path from "path";
import axios from "axios";
import { Prisma } from "@repo/db/generated/prisma";
import { Decimal } from "decimal.js";
import {
  ExtendedClaimSchema,
  InputServiceLine,
  updateClaimSchema,
} from "@repo/db/types";

const router = Router();

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
        return res.status(404).json({
          error:
            "No insurance credentials found for this provider. Kindly Update this at Settings Page.",
        });
      }

      const enrichedData = {
        ...claimData,
        massdhpUsername: credentials.username,
        massdhpPassword: credentials.password,
      };

      const result = await forwardToSeleniumClaimAgent(enrichedData, [
        ...pdfs,
        ...images,
      ]);

      res.json({
        ...result,
        claimId: claimData.claimId,
      });
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

      const { patientId, pdf_url } = req.body;

      if (!pdf_url) {
        return sendError(res, "Missing pdf_url");
      }

      if (!patientId) {
        return sendError(res, "Missing Patient Id");
      }

      const parsedPatientId = parseInt(patientId);

      const filename = path.basename(new URL(pdf_url).pathname);
      const pdfResponse = await axios.get(pdf_url, {
        responseType: "arraybuffer",
      });

      const groupTitle = "Claims";
      const groupTitleKey = "INSURANCE_CLAIM";

      // ✅ Find or create PDF group for this claim
      let group = await storage.findPdfGroupByPatientTitleKey(
        parsedPatientId,
        groupTitleKey
      );

      if (!group) {
        group = await storage.createPdfGroup(
          parsedPatientId,
          groupTitle,
          groupTitleKey
        );
      }

      // ✅ Save PDF file into that group
      await storage.createPdfFile(group.id!, filename, pdfResponse.data);

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

// GET /api/claims/recent
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const [claims, totalCount] = await Promise.all([
      storage.getRecentClaims(limit, offset),
      storage.getTotalClaimCount(),
    ]);

    res.json({ claims, totalCount });
  } catch (error) {
    console.error("Failed to retrieve recent claims:", error);
    res.status(500).json({ message: "Failed to retrieve recent claims" });
  }
});

// GET /api/claims/patient/:patientId
router.get(
  "/patient/:patientId",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const patientIdParam = req.params.patientId;
      if (!patientIdParam) {
        return res.status(400).json({ message: "Missing patientId" });
      }
      const patientId = parseInt(patientIdParam);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patientId" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }

      const [claims, totalCount] = await Promise.all([
        storage.getRecentClaimsByPatientId(patientId, limit, offset),
        storage.getTotalClaimCountByPatient(patientId),
      ]);

      res.json({ claims, totalCount });
    } catch (error) {
      console.error("Failed to retrieve claims for patient:", error);
      res.status(500).json({ message: "Failed to retrieve patient claims" });
    }
  }
);

// Get all claims count.
router.get("/all", async (req: Request, res: Response) => {
  try {
    const claims = await storage.getTotalClaimCount();
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve claims count" });
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

    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve claim" });
  }
});

// Create a new claim
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    // --- TRANSFORM claimFiles (if provided) into Prisma nested-create shape
    if (Array.isArray(req.body.claimFiles)) {
      // each item expected: { filename: string, mimeType: string }
      req.body.claimFiles = {
        create: req.body.claimFiles.map((f: any) => ({
          filename: String(f.filename),
          mimeType: String(f.mimeType || f.mime || ""),
        })),
      };
    }

    // --- TRANSFORM serviceLines
    if (Array.isArray(req.body.serviceLines)) {
      req.body.serviceLines = req.body.serviceLines.map(
        (line: InputServiceLine) => ({
          ...line,
          totalBilled: Number(line.totalBilled),
          totalAdjusted: 0,
          totalPaid: 0,
          totalDue: Number(line.totalBilled),
        })
      );
      req.body.serviceLines = { create: req.body.serviceLines };
    }

    const parsedClaim = ExtendedClaimSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    // Step 1: Calculate total billed from service lines
    const serviceLinesCreateInput = (
      parsedClaim.serviceLines as Prisma.ServiceLineCreateNestedManyWithoutClaimInput
    )?.create;
    const lines = Array.isArray(serviceLinesCreateInput)
      ? (serviceLinesCreateInput as unknown as {
          totalBilled: number | string;
        }[])
      : [];
    const totalBilled = lines.reduce(
      (sum, line) => sum + Number(line.totalBilled ?? 0),
      0
    );

    // Step 2: Create claim (with service lines)
    const claim = await storage.createClaim(parsedClaim);

    // Step 3: Create empty payment
    await storage.createPayment({
      claimId: claim.id,
      patientId: claim.patientId,
      userId: req.user!.id,
      totalBilled: new Decimal(totalBilled),
      totalPaid: new Decimal(0),
      totalDue: new Decimal(totalBilled),
      status: "PENDING",
      notes: "",
    });

    res.status(201).json(claim);
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
      return res.status(403).json({
        message:
          "Forbidden: Claim belongs to a different user, you can't delete this.",
      });
    }

    await storage.deleteClaim(claimId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete claim" });
  }
});

export default router;
