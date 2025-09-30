import express, { Request, Response } from "express";
import storage from "../storage";
import { serializeFile } from "../utils/prismaFileUtils";
import { CloudFolder } from "@repo/db/types";

const router = express.Router();

/* ---------- Helpers ---------- */
function parsePositiveInt(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function sendError(
  res: Response,
  status: number,
  message: string,
  details?: any
) {
  return res.status(status).json({ error: true, message, details });
}

/* ---------- Paginated child FOLDERS for a parent ----------
   GET /items/folders?parentId=&limit=&offset=
   parentId may be "null" or numeric or absent (means root)
*/
router.get(
  "/items/folders",
  async (req: Request, res: Response): Promise<any> => {
    const rawParent = req.query.parentId;
    const parentId =
      rawParent === undefined
        ? null
        : rawParent === "null"
          ? null
          : Number(rawParent);

    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      return sendError(res, 400, "Invalid parentId");
    }

    const limit = parsePositiveInt(req.query.limit, 10); // default 10 folders/page
    const offset = parsePositiveInt(req.query.offset, 0);

    try {
      // Prefer a storage method that lists folders by parent, otherwise filter
      let data: CloudFolder[] = [];
      if (typeof (storage as any).listFoldersByParent === "function") {
        data = await (storage as any).listFoldersByParent(
          parentId,
          limit,
          offset
        );
        const total =
          (await (storage as any).countFoldersByParent?.(parentId)) ??
          data.length;
        return res.json({ error: false, data, total, limit, offset });
      }

      // Fallback: use recent and filter (less efficient). Recommend implementing listFoldersByParent in storage.
      const recent = await storage.listRecentFolders(1000, 0);
      const folders = (recent || []).filter(
        (f: any) => (f as any).parentId === parentId
      );
      const paged = folders.slice(offset, offset + limit);
      return res.json({
        error: false,
        data: paged,
        totalCount: folders.length,
      });
    } catch (err) {
      return sendError(res, 500, "Failed to load child folders", err);
    }
  }
);

/* ---------- Paginated files for a folder ----------
   GET /items/files?parentId=&limit=&offset=
   parentId may be "null" or numeric or absent (means root)
*/
router.get(
  "/items/files",
  async (req: Request, res: Response): Promise<any> => {
    const rawParent = req.query.parentId;
    const parentId =
      rawParent === undefined
        ? null
        : rawParent === "null"
          ? null
          : Number(rawParent);

    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      return sendError(res, 400, "Invalid parentId");
    }

    const limit = parsePositiveInt(req.query.limit, 20); // default 20 files/page
    const offset = parsePositiveInt(req.query.offset, 0);

    try {
      const files = await storage.listFilesInFolder(parentId, limit, offset);
      const totalCount = await storage.countFilesInFolder(parentId);
      const serialized = files.map(serializeFile);
      return res.json({ error: false, data: serialized, totalCount });
    } catch (err) {
      return sendError(res, 500, "Failed to load files for folder", err);
    }
  }
);

/* ---------- Recent folders (global) ----------
   GET /folders/recent?limit=&offset=
*/
router.get(
  "/folders/recent",
  async (req: Request, res: Response): Promise<any> => {
    const limit = parsePositiveInt(req.query.limit, 50);
    const offset = parsePositiveInt(req.query.offset, 0);
    try {
      // Always request top-level folders (parentId = null)
      const parentId: number | null = null;
      const folders = await storage.listRecentFolders(limit, offset, parentId);
      const totalCount = await storage.countFoldersByParent(parentId);

      return res.json({
        error: false,
        data: folders,
        totalCount,
      });
    } catch (err) {
      return sendError(res, 500, "Failed to load recent folders");
    }
  }
);

// ---------- Folder CRUD ----------
router.get(
  "/folders/:id",
  async (req: Request, res: Response): Promise<any> => {
    const id = Number.parseInt(req.params.id ?? "", 10);
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid folder id");

    try {
      const folder = await storage.getFolder(id);
      if (!folder) return sendError(res, 404, "Folder not found");
      return res.json({ error: false, data: folder });
    } catch (err) {
      return sendError(res, 500, "Failed to load folder");
    }
  }
);

router.post("/folders", async (req: Request, res: Response): Promise<any> => {
  const { userId, name, parentId } = req.body;
  if (!userId || typeof name !== "string" || !name.trim()) {
    return sendError(res, 400, "Missing or invalid userId/name");
  }
  try {
    const created = await storage.createFolder(
      userId,
      name.trim(),
      parentId ?? null
    );
    return res.status(201).json({ error: false, data: created });
  } catch (err) {
    return sendError(res, 500, "Failed to create folder");
  }
});

router.put(
  "/folders/:id",
  async (req: Request, res: Response): Promise<any> => {
    // coerce possibly-undefined param to string before parsing
    const id = Number.parseInt(req.params.id ?? "", 10);
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid folder id");

    const updates: any = {};
    if (typeof req.body.name === "string") updates.name = req.body.name.trim();
    if (req.body.parentId !== undefined) updates.parentId = req.body.parentId;

    try {
      const updated = await storage.updateFolder(id, updates);
      if (!updated)
        return sendError(res, 404, "Folder not found or update failed");
      return res.json({ error: false, data: updated });
    } catch (err) {
      return sendError(res, 500, "Failed to update folder");
    }
  }
);

router.delete(
  "/folders/:id",
  async (req: Request, res: Response): Promise<any> => {
    const id = Number.parseInt(req.params.id ?? "", 10);
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid folder id");
    try {
      const ok = await storage.deleteFolder(id);
      if (!ok) return sendError(res, 404, "Folder not found or delete failed");
      return res.json({ error: false, data: { id } });
    } catch (err) {
      return sendError(res, 500, "Failed to delete folder");
    }
  }
);

/* ---------- Files inside folder (pagination) ----------
   GET /folders/:id/files?limit=&offset=
   id = "null" lists files with folderId = null
   responses serialized
*/
router.get(
  "/folders/:id/files",
  async (req: Request, res: Response): Promise<any> => {
    const rawId = req.params.id;
    const folderId = rawId === "null" ? null : Number.parseInt(rawId ?? "", 10);
    if (folderId !== null && (!Number.isInteger(folderId) || folderId <= 0)) {
      return sendError(res, 400, "Invalid folder id");
    }

    const limit = parsePositiveInt(req.query.limit, 50);
    const offset = parsePositiveInt(req.query.offset, 0);

    try {
      const files = await storage.listFilesInFolder(folderId, limit, offset);
      const totalCount = await storage.countFilesInFolder(folderId);
      const serialized = files.map(serializeFile);
      return res.json({ error: false, data: serialized, totalCount });
    } catch (err) {
      return sendError(res, 500, "Failed to list files for folder");
    }
  }
);

/* ---------- File CRUD (init, update metadata, delete) ----------
   POST /folders/:id/files   { userId, name, mimeType?, expectedSize?, totalChunks? }
   PUT  /files/:id          { name?, mimeType?, folderId? }
   DELETE /files/:id
*/
const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

router.post(
  "/folders/:id/files",
  async (req: Request, res: Response): Promise<any> => {
    const rawId = req.params.id;
    const folderId = rawId === "null" ? null : Number.parseInt(rawId ?? "", 10);
    if (folderId !== null && (!Number.isInteger(folderId) || folderId <= 0)) {
      return sendError(res, 400, "Invalid folder id");
    }

    const { userId, name, mimeType } = req.body;
    if (!userId || typeof name !== "string" || !name.trim()) {
      return sendError(res, 400, "Missing or invalid userId/name");
    }

    // coerce size & chunks
    let expectedSize: bigint | null = null;
    if (req.body.expectedSize != null) {
      try {
        // coerce to BigInt safely
        const asNum = Number(req.body.expectedSize);
        if (!Number.isFinite(asNum) || asNum < 0) {
          return sendError(res, 400, "Invalid expectedSize");
        }
        if (asNum > MAX_FILE_BYTES) {
          // Payload Too Large
          return sendError(
            res,
            413,
            `File too large. Max allowed is ${MAX_FILE_MB} MB`
          );
        }
        expectedSize = BigInt(String(req.body.expectedSize));
      } catch {
        return sendError(res, 400, "Invalid expectedSize");
      }
    }

    let totalChunks: number | null = null;
    if (req.body.totalChunks != null) {
      const tc = Number(req.body.totalChunks);
      if (!Number.isFinite(tc) || tc <= 0)
        return sendError(res, 400, "Invalid totalChunks");
      totalChunks = Math.floor(tc);
    }

    try {
      const created = await storage.initializeFileUpload(
        userId,
        name.trim(),
        mimeType ?? null,
        expectedSize,
        totalChunks,
        folderId
      );
      return res
        .status(201)
        .json({ error: false, data: serializeFile(created as any) });
    } catch {
      return sendError(res, 500, "Failed to create file");
    }
  }
);

/* ---------- 2. CHUNKS (raw upload) ---------- */
router.post(
  "/files/:id/chunks",
  // only here: use express.raw so req.body is Buffer
  express.raw({ type: () => true, limit: "100mb" }),
  async (req: Request, res: Response): Promise<any> => {
    const id = Number.parseInt(req.params.id ?? "", 10);
    const seq = Number.parseInt(
      String(req.query.seq ?? req.body.seq ?? ""),
      10
    );
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid file id");
    if (!Number.isInteger(seq) || seq < 0)
      return sendError(res, 400, "Invalid seq");

    const body = req.body as Buffer;

    if (!body || !(body instanceof Buffer)) {
      return sendError(res, 400, "Expected raw binary body (Buffer)");
    }

    // strict size guard: any single chunk must not exceed MAX_FILE_BYTES
    if (body.length > MAX_FILE_BYTES) {
      return sendError(res, 413, `Chunk size exceeds ${MAX_FILE_MB} MB limit`);
    }

    try {
      await storage.appendFileChunk(id, seq, body);
      return res.json({ error: false, data: { fileId: id, seq } });
    } catch (err: any) {
      return sendError(res, 500, "Failed to add chunk");
    }
  }
);

/* ---------- 3. COMPLETE ---------- */
router.post(
  "/files/:id/complete",
  async (req: Request, res: Response): Promise<any> => {
    const id = Number.parseInt(req.params.id ?? "", 10);
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid file id");

    try {
      // Ask storage for the file (includes chunks in your implementation)
      const file = await storage.getFile(id);
      if (!file) return sendError(res, 404, "File not found");

      // Sum chunks' sizes (storage.getFile returns chunks ordered by seq in your impl)
      const chunks = (file as any).chunks ?? [];
      if (!chunks.length) return sendError(res, 400, "No chunks uploaded");

      let total = 0;
      for (const c of chunks) {
        // c.data is Bytes / Buffer-like
        total += c.data.length;
        // early bailout
        if (total > MAX_FILE_BYTES) {
          return sendError(
            res,
            413,
            `Assembled file is too large (${Math.round(total / 1024 / 1024)} MB). Max allowed is ${MAX_FILE_MB} MB.`
          );
        }
      }

      const result = await storage.finalizeFileUpload(id);
      return res.json({ error: false, data: result });
    } catch (err: any) {
      return sendError(res, 500, err?.message || "Failed to complete file");
    }
  }
);

router.put("/files/:id", async (req: Request, res: Response): Promise<any> => {
  const id = Number.parseInt(req.params.id ?? "", 10);
  if (!Number.isInteger(id) || id <= 0)
    return sendError(res, 400, "Invalid file id");

  const updates: any = {};
  if (typeof req.body.name === "string") updates.name = req.body.name.trim();
  if (typeof req.body.mimeType === "string")
    updates.mimeType = req.body.mimeType;
  if (req.body.folderId !== undefined) updates.folderId = req.body.folderId;

  try {
    const updated = await storage.updateFile(id, updates);
    if (!updated) return sendError(res, 404, "File not found or update failed");
    return res.json({ error: false, data: serializeFile(updated as any) });
  } catch (err) {
    return sendError(res, 500, "Failed to update file metadata");
  }
});

router.delete(
  "/files/:id",
  async (req: Request, res: Response): Promise<any> => {
    const id = Number.parseInt(req.params.id ?? "", 10);
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid file id");

    try {
      const ok = await storage.deleteFile(id);
      if (!ok) return sendError(res, 404, "File not found or delete failed");
      return res.json({ error: false, data: { id } });
    } catch (err) {
      return sendError(res, 500, "Failed to delete file");
    }
  }
);

/* GET /files/:id -> return serialized metadata (used by preview modal) */
router.get("/files/:id", async (req: Request, res: Response): Promise<any> => {
  const id = Number.parseInt(req.params.id ?? "", 10);
  if (!Number.isInteger(id) || id <= 0)
    return sendError(res, 400, "Invalid file id");

  try {
    const file = await storage.getFile(id);
    if (!file) return sendError(res, 404, "File not found");
    return res.json({ error: false, data: serializeFile(file as any) });
  } catch (err) {
    return sendError(res, 500, "Failed to load file");
  }
});

/* GET /files/:id/content -> stream file with inline disposition for preview */
router.get(
  "/files/:id/content",
  async (req: Request, res: Response): Promise<any> => {
    const id = Number.parseInt(req.params.id ?? "", 10);
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid file id");

    try {
      const file = await storage.getFile(id);
      if (!file) return sendError(res, 404, "File not found");

      const filename = (file.name ?? `file-${(file as any).id}`).replace(
        /["\\]/g,
        ""
      );

      if ((file as any).mimeType)
        res.setHeader("Content-Type", (file as any).mimeType);
      // NOTE: inline instead of attachment so browser can render (images, pdfs)
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(filename)}"`
      );

      await storage.streamFileTo(res, id);

      if (!res.writableEnded) res.end();
    } catch (err) {
      if (res.headersSent) return res.end();
      return sendError(res, 500, "Failed to stream file");
    }
  }
);
/* GET /files/:id/download */
router.get(
  "/files/:id/download",
  async (req: Request, res: Response): Promise<any> => {
    const id = Number.parseInt(req.params.id ?? "", 10);
    if (!Number.isInteger(id) || id <= 0)
      return sendError(res, 400, "Invalid file id");

    try {
      const file = await storage.getFile(id);
      if (!file) return sendError(res, 404, "File not found");

      const filename = (file.name ?? `file-${(file as any).id}`).replace(
        /["\\]/g,
        ""
      );
      if ((file as any).mimeType)
        res.setHeader("Content-Type", (file as any).mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(filename)}"`
      );

      await storage.streamFileTo(res, id);

      if (!res.writableEnded) res.end();
    } catch (err) {
      if (res.headersSent) return res.end();
      return sendError(res, 500, "Failed to stream file");
    }
  }
);

/* ---------- Search endpoints (separate) ----------
   GET /search/folders?q=&limit=&offset=
   GET /search/files?q=&type=&limit=&offset=
*/
router.get(
  "/search/folders",
  async (req: Request, res: Response): Promise<any> => {
    const q = String(req.query.q ?? "").trim();
    const limit = parsePositiveInt(req.query.limit, 20);
    const offset = parsePositiveInt(req.query.offset, 0);
    if (!q) return sendError(res, 400, "Missing search query parameter 'q'");

    try {
      const parentId = null;

      const { data, total } = await storage.searchFolders(
        q,
        limit,
        offset,
        parentId
      );
      return res.json({ error: false, data, totalCount: total });
    } catch (err) {
      return sendError(res, 500, "Folder search failed");
    }
  }
);

router.get(
  "/search/files",
  async (req: Request, res: Response): Promise<any> => {
    const q = String(req.query.q ?? "").trim();
    const type =
      typeof req.query.type === "string" ? req.query.type.trim() : undefined;
    const limit = parsePositiveInt(req.query.limit, 20);
    const offset = parsePositiveInt(req.query.offset, 0);
    if (!q && !type)
      return sendError(
        res,
        400,
        "Provide at least one of 'q' or 'type' to search files"
      );

    try {
      const { data, total } = await storage.searchFiles(q, type, limit, offset);
      const serialized = data.map(serializeFile);
      return res.json({ error: false, data: serialized, totalCount: total });
    } catch (err) {
      return sendError(res, 500, "File search failed");
    }
  }
);

export default router;
