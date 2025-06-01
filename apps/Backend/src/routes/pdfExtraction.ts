import { Router } from "express";
import type { Request, Response } from "express";
const router = Router();
import  multer from "multer";
import forwardToPdfService from "../services/PdfClient";

const upload = multer({ storage: multer.memoryStorage() });

router.post("/extract", upload.single("pdf"), async (req: Request, res: Response): Promise<any>=> {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded." });
  }

  try {
    const result = await forwardToPdfService(req.file);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extraction failed" });
  }
});

export default router;
