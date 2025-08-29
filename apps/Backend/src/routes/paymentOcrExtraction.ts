import { Router, Request, Response } from "express";
import multer from "multer";
import { forwardToPaymentOCRService } from "../services/paymentOCRService"; 

const router = Router();

// keep files in memory; FastAPI accepts them as multipart bytes
const upload = multer({ storage: multer.memoryStorage() });

// POST /payment-ocr/extract  (field name: "files")
router.post(
  "/extract",
  upload.array("files"), // allow multiple images
  async (req: Request, res: Response): Promise<any> => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        return res
          .status(400)
          .json({ error: "No image files uploaded. Use field name 'files'." });
      }

      // (optional) basic client-side MIME guard
      const allowed = new Set([
        "image/jpeg",
        "image/png",
        "image/tiff",
        "image/bmp",
        "image/jpg",
      ]);
      const bad = files.filter((f) => !allowed.has(f.mimetype.toLowerCase()));
      if (bad.length) {
        return res.status(415).json({
          error: `Unsupported file types: ${bad
            .map((b) => b.originalname)
            .join(", ")}`,
        });
      }

      const rows = await forwardToPaymentOCRService(files);
      return res.json({ rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Payment OCR extraction failed" });
    }
  }
);

export default router;
