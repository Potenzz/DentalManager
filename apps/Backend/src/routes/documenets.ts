import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post("/claim-pdf/upload", upload.single("file"), async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId, claimId } = req.body;
    const file = req.file;

    if (!patientId || !claimId) {
      return res.status(400).json({ error: "Missing patientId, or claimId" });
    }

    if (!file){
      return res.status(400).json({ error: "Missing file" });
    }

    const created = await storage.createClaimPdf(
      parseInt(patientId),
      parseInt(claimId),
      file.originalname,
      file.buffer
    );

    res.json(created);
  } catch (err) {
    console.error("Error uploading claim PDF:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/claim-pdf/recent", async (req: Request, res: Response): Promise<any> => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const offset = parseInt(req.query.offset as string) || 0;

    const recent = await storage.getRecentClaimPdfs(limit, offset);
    res.json(recent);
  } catch (err) {
    console.error("Error fetching recent PDFs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/claim-pdf/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) return res.status(400).json({ error: "Missing ID" });

    const id = parseInt(idParam);
    const pdf = await storage.getClaimPdfById(id);

    if (!pdf || !pdf.pdfData) return res.status(404).json({ error: "PDF not found" });

    // Fix bad objectified Buffer
    if (!Buffer.isBuffer(pdf.pdfData)) {
      pdf.pdfData = Buffer.from(Object.values(pdf.pdfData));
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
  "Content-Disposition",
  `attachment; filename="${pdf.filename}"; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`
);
    res.send(pdf.pdfData);
  } catch (err) {
    console.error("Error fetching PDF by ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/claim-pdf/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) return res.status(400).json({ error: "Missing ID" });

    const id = parseInt(idParam);
    const success = await storage.deleteClaimPdf(id);

    res.json({ success });
  } catch (err) {
    console.error("Error deleting PDF:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/claim-pdf/:id", upload.single("file"), async (req: Request, res: Response): Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) return res.status(400).json({ error: "Missing ID" });

    const id = parseInt(idParam);
    const file = req.file;

    const updated = await storage.updateClaimPdf(id, {
      filename: file?.originalname,
      pdfData: file?.buffer,
    });

    if (!updated) return res.status(404).json({ error: "PDF not found or update failed" });

    res.json(updated);
  } catch (err) {
    console.error("Error updating PDF:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
