import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ClaimUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";

const router = Router();


router.post("/claim-pdf/upload", upload.single("file"), async (req: Request, res: Response) => {
  const { patientId, claimId } = req.body;
  const file = req.file;

  if (!file || !patientId) return res.status(400).json({ error: "Missing file or patientId" });

  const created = await storage.createClaimPdf({
    filename: file.originalname,
    patientId: parseInt(patientId),
    claimId: claimId ? parseInt(claimId) : undefined,
    pdfData: file.buffer,
  });

  res.json(created);
});

router.get("/claim-pdf/recent", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const offset = parseInt(req.query.offset as string) || 0;

  const recent = await storage.getRecentClaimPdfs(limit, offset);
  res.json(recent);
});

router.get("/claim-pdf/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const pdf = await storage.getClaimPdfById(id);

  if (!pdf) return res.status(404).json({ error: "PDF not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.send(pdf.pdfData);
});

router.delete("/claim-pdf/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const success = await storage.deleteClaimPdf(id);

  res.json({ success });
});

router.put("/claim-pdf/:id", upload.single("file"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const file = req.file;
  const claimId = req.body.claimId ? parseInt(req.body.claimId) : undefined;

  const updated = await storage.updateClaimPdf(id, {
    claimId,
    filename: file?.originalname,
    pdfData: file?.buffer,
  });

  if (!updated) return res.status(404).json({ error: "PDF not found or update failed" });

  res.json(updated);
});

export default router;
