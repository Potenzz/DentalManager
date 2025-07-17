import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ----------- PDF GROUPS ------------------
router.post(
  "/pdf-groups",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { title, category, patientId } = req.body;
      if (!title || !category || !patientId) {
        return res
          .status(400)
          .json({ error: "Missing title, category, or patientId" });
      }

      const group = await storage.createPdfGroup(
        parseInt(patientId),
        title,
        category
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
      const { title, category } = req.body;
      const updated = await storage.updatePdfGroup(id, { title, category });
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

router.get("/pdf-files/group/:groupId", async (req: Request, res: Response):Promise<any> => {
  try {
    const idParam = req.params.groupId;
      if (!idParam) {
        return res.status(400).json({ error: "Missing Groupt ID" });
      }
    const groupId = parseInt(idParam);
    const files = await storage.getPdfFilesByGroupId(groupId); // implement this
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get(
  "/pdf-files/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        return res.status(400).json({ error: "Missing ID" });
      }
      const id = parseInt(idParam);
      const pdf = await storage.getPdfFileById(id);
      if (!pdf || !pdf.pdfData)
        return res.status(404).json({ error: "PDF not found" });

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
