import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import multer from "multer";
import { forwardToSeleniumAgent } from "../services/seleniumClaimClient";

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


export default router;