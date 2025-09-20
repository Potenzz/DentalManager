import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import multer from "multer";
import { PdfFile } from "../../../../packages/db/types/pdf-types";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ----------- PDF GROUPS ------------------
router.post(
  "/pdf-groups",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { patientId, groupTitle, groupTitleKey } = req.body;
      if (!patientId || !groupTitle || groupTitleKey) {
        return res
          .status(400)
          .json({ error: "Missing title, titleKey, or patientId" });
      }

      const group = await storage.createPdfGroup(
        parseInt(patientId),
        groupTitle,
        groupTitleKey
      );

      res.json(group);
    } catch (err) {
      console.error("Error creating PDF group:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/pdf-groups/patient/:patientId",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        return res.status(400).json({ error: "Missing patient ID" });
      }

      const groups = await storage.getPdfGroupsByPatientId(parseInt(patientId));
      res.json(groups);
    } catch (err) {
      console.error("Error fetching groups by patient ID:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/pdf-groups/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        return res.status(400).json({ error: "Missing ID" });
      }
      const id = parseInt(idParam);
      const group = await storage.getPdfGroupById(id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      res.json(group);
    } catch (err) {
      console.error("Error fetching PDF group:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get("/pdf-groups", async (req: Request, res: Response): Promise<any> => {
  try {
    const groups = await storage.getAllPdfGroups();
    res.json(groups);
  } catch (err) {
    console.error("Error listing PDF groups:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/pdf-groups/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        return res.status(400).json({ error: "Missing ID" });
      }
      const id = parseInt(idParam);
      const { title, titleKey } = req.body;

      const updates: any = {};
      updates.title = title;
      updates.titleKey = titleKey;

      const updated = await storage.updatePdfGroup(id, updates);
      if (!updated) return res.status(404).json({ error: "Group not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating PDF group:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/pdf-groups/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        return res.status(400).json({ error: "Missing ID" });
      }
      const id = parseInt(idParam);
      const success = await storage.deletePdfGroup(id);
      res.json({ success });
    } catch (err) {
      console.error("Error deleting PDF group:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ----------- PDF FILES ------------------
router.post(
  "/pdf-files",
  upload.single("file"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { groupId } = req.body;
      const file = req.file;
      if (!groupId || !file) {
        return res.status(400).json({ error: "Missing groupId or file" });
      }

      const pdf = await storage.createPdfFile(
        parseInt(groupId),
        file.originalname,
        file.buffer
      );

      res.json(pdf);
    } catch (err) {
      console.error("Error uploading PDF file:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/pdf-files/group/:groupId",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.groupId;
      if (!idParam) {
        return res.status(400).json({ error: "Missing Groupt ID" });
      }
      const groupId = parseInt(idParam);
      const files = await storage.getPdfFilesByGroupId(groupId);
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /pdf-files/group/:groupId
 * Query params:
 *   - limit (optional, defaults to 5): number of items per page (max 1000)
 *   - offset (optional, defaults to 0): offset for pagination
 *
 * Response: { total: number, data: PdfFile[] }
 */
router.get(
  "/recent-pdf-files/group/:groupId",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const rawGroupId = req.params.groupId;
      if (!rawGroupId) {
        return res.status(400).json({ error: "Missing groupId param" });
      }

      const groupId = Number(rawGroupId);
      if (Number.isNaN(groupId) || groupId <= 0) {
        return res.status(400).json({ error: "Invalid groupId" });
      }

      // Parse & sanitize query params
      const limitQuery = req.query.limit;
      const offsetQuery = req.query.offset;

      const limit =
        limitQuery !== undefined
          ? Math.min(Math.max(Number(limitQuery), 1), 1000) // 1..1000
          : undefined; // if undefined -> treat as "no pagination" (return all)
      const offset =
        offsetQuery !== undefined ? Math.max(Number(offsetQuery), 0) : 0;

      // Decide whether client asked for paginated response
      const wantsPagination = typeof limit === "number";

      if (wantsPagination) {
        // storage.getPdfFilesByGroupId with pagination should return { total, data }
        const result = await storage.getPdfFilesByGroupId(groupId, {
          limit,
          offset,
          withGroup: false, // do not include group relation in listing
        });

        // result should be { total, data }, but handle unexpected shapes defensively
        if (Array.isArray(result)) {
          // fallback: storage returned full array; compute total
          return res.json({ total: result.length, data: result });
        }

        return res.json(result);
      } else {
        // no limit requested -> return all files for the group
        const all = (await storage.getPdfFilesByGroupId(groupId)) as PdfFile[];
        return res.json({ total: all.length, data: all });
      }
    } catch (err) {
      console.error("GET /pdf-files/group/:groupId error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/pdf-files/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        return res.status(400).json({ error: "Missing ID" });
      }
      const id = parseInt(idParam, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }

      const pdf = await storage.getPdfFileById(id);
      if (!pdf || !pdf.pdfData) {
        return res.status(404).json({ error: "PDF not found" });
      }

      const data: any = pdf.pdfData;

      // Helper: try many plausible conversions into a Buffer
      function normalizeToBuffer(d: any): Buffer | null {
        // Already a Buffer
        if (Buffer.isBuffer(d)) return d;

        // Uint8Array or other typed arrays
        if (d instanceof Uint8Array) return Buffer.from(d);

        // ArrayBuffer
        if (d instanceof ArrayBuffer) return Buffer.from(new Uint8Array(d));

        // number[] (common)
        if (Array.isArray(d) && d.every((n) => typeof n === "number")) {
          return Buffer.from(d as number[]);
        }

        // Some drivers: { data: number[] }
        if (
          d &&
          typeof d === "object" &&
          Array.isArray(d.data) &&
          d.data.every((n: any) => typeof n === "number")
        ) {
          return Buffer.from(d.data as number[]);
        }

        // Some drivers return object with numeric keys: { '0': 37, '1': 80, ... }
        if (d && typeof d === "object") {
          const keys = Object.keys(d);
          const numericKeys = keys.filter((k) => /^\d+$/.test(k));
          if (numericKeys.length > 0 && numericKeys.length === keys.length) {
            // sort numeric keys to correct order and map to numbers
            const sorted = numericKeys
              .map((k) => parseInt(k, 10))
              .sort((a, b) => a - b)
              .map((n) => d[String(n)]);
            if (sorted.every((v) => typeof v === "number")) {
              return Buffer.from(sorted as number[]);
            }
          }
        }

        // Last resort: if Object.values(d) yields numbers (this is what you used originally)
        try {
          const vals = Object.values(d);
          if (Array.isArray(vals) && vals.every((v) => typeof v === "number")) {
            // coerce to number[] for TS safety
            return Buffer.from(vals as number[]);
          }
        } catch {
          // ignore
        }

        // give up
        return null;
      }

      const pdfBuffer = normalizeToBuffer(data);

      if (!pdfBuffer) {
        console.error("Unsupported pdf.pdfData shape:", {
          typeofData: typeof data,
          constructorName:
            data && data.constructor ? data.constructor.name : undefined,
          keys:
            data && typeof data === "object"
              ? Object.keys(data).slice(0, 20)
              : undefined,
          sample: (() => {
            if (Array.isArray(data)) return data.slice(0, 20);
            if (data && typeof data === "object") {
              const vals = Object.values(data);
              return Array.isArray(vals) ? vals.slice(0, 20) : undefined;
            }
            return String(data).slice(0, 200);
          })(),
        });

        // Try a safe textual fallback (may produce invalid PDF but avoids crashing)
        try {
          const fallback = Buffer.from(String(data));
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${pdf.filename}"; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`
          );
          return res.send(fallback);
        } catch (err) {
          console.error("Failed fallback conversion:", err);
          return res.status(500).json({ error: "Cannot process PDF data" });
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${pdf.filename}"; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error("Error downloading PDF file:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/pdf-files/recent",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const offset = parseInt(req.query.offset as string) || 0;
      const files = await storage.getRecentPdfFiles(limit, offset);
      res.json(files);
    } catch (err) {
      console.error("Error getting recent PDF files:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/pdf-files/:id",
  upload.single("file"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        return res.status(400).json({ error: "Missing ID" });
      }
      const id = parseInt(idParam);
      const file = req.file;

      const updated = await storage.updatePdfFile(id, {
        filename: file?.originalname,
        pdfData: file?.buffer,
      });

      if (!updated)
        return res
          .status(404)
          .json({ error: "PDF not found or update failed" });

      res.json(updated);
    } catch (err) {
      console.error("Error updating PDF file:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/pdf-files/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        return res.status(400).json({ error: "Missing ID" });
      }
      const id = parseInt(idParam);

      const success = await storage.deletePdfFile(id);
      res.json({ success });
    } catch (err) {
      console.error("Error deleting PDF file:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
