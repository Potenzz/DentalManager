import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { prisma } from "@repo/db/client";
import { storage } from "../storage";
import archiver from "archiver";
import { backupDatabaseToPath } from "../services/databaseBackupService";

const router = Router();

/**
 * Create a database backup
 *
 * - Uses pg_dump in directory format for parallel dump to a tmp dir
 * - Uses 'archiver' to create zip or gzipped tar stream directly to response
 * - Supports explicit override via BACKUP_ARCHIVE_FORMAT env var ('zip' or 'tar')
 * - Ensures cleanup of tmp dir on success/error/client disconnect
 */

// helper to remove directory (sync to keep code straightforward)
function safeRmDir(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    /* ignore */
  }
}
router.post("/backup", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const destination = await storage.getActiveBackupDestination(userId);

    // create a unique tmp directory for directory-format dump
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental_backup_")); // MUST

    // Decide archive format
    // BACKUP_ARCHIVE_FORMAT can be 'zip' or 'tar' (case-insensitive)
    const forced = (process.env.BACKUP_ARCHIVE_FORMAT || "").toLowerCase();
    const useZip =
      forced === "zip"
        ? true
        : forced === "tar"
          ? false
          : process.platform === "win32";

    const filename = useZip
      ? `dental_backup_${Date.now()}.zip`
      : `dental_backup_${Date.now()}.tar.gz`;

    // Spawn pg_dump
    const pgDump = spawn(
      "pg_dump",
      [
        "-Fd", // DIRECTORY format (required for parallel dump)
        "-j",
        "4", // number of parallel jobs — MUST be >0 for parallelism
        "--no-acl",
        "--no-owner",
        "-h",
        process.env.DB_HOST || "localhost",
        "-U",
        process.env.DB_USER || "postgres",
        process.env.DB_NAME || "dental_db",
        "-f",
        tmpDir, // write parallely
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD,
        },
      }
    );

    let pgStderr = "";
    pgDump.stderr.on("data", (chunk) => {
      pgStderr += chunk.toString();
    });

    pgDump.on("error", (err) => {
      safeRmDir(tmpDir);
      console.error("Failed to start pg_dump:", err);
      // If headers haven't been sent, respond; otherwise just end socket
      if (!res.headersSent) {
        return res
          .status(500)
          .json({ error: "Failed to run pg_dump", details: err.message });
      } else {
        res.destroy(err);
      }
    });

    pgDump.on("close", async (code) => {
      if (code !== 0) {
        safeRmDir(tmpDir);
        console.error("pg_dump failed:", pgStderr || `exit ${code}`);
        if (!res.headersSent) {
          return res.status(500).json({
            error: "Backup failed",
            details: pgStderr || `pg_dump exited with ${code}`,
          });
        } else {
          // headers already sent — destroy response
          res.destroy(new Error("pg_dump failed"));
          return;
        }
      }

      // pg_dump succeeded — stream archive directly to response using archiver
      // Set headers before piping
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        useZip ? "application/zip" : "application/gzip"
      );

      const archive = archiver(
        useZip ? "zip" : "tar",
        useZip ? {} : { gzip: true, gzipOptions: { level: 6 } }
      );

      let archErr: string | null = null;
      archive.on("error", (err) => {
        archErr = err.message;
        console.error("Archiver error:", err);
        // attempt to respond with error if possible
        try {
          if (!res.headersSent) {
            res.status(500).json({
              error: "Failed to create archive",
              details: err.message,
            });
          } else {
            // if streaming already started, destroy the connection
            res.destroy(err);
          }
        } catch (e) {
          // swallow
        } finally {
          safeRmDir(tmpDir);
        }
      });

      // If client disconnects while streaming
      res.once("close", () => {
        // destroy archiver (stop processing) and cleanup tmpDir
        try {
          archive.destroy();
        } catch (e) {}
        safeRmDir(tmpDir);
      });

      // When streaming finishes successfully
      res.once("finish", async () => {
        // cleanup the tmp dir used by pg_dump
        safeRmDir(tmpDir);

        // update metadata (try/catch so it won't break response flow)
        try {
          await storage.createBackup(userId);
          await storage.deleteNotificationsByType(userId, "BACKUP");
        } catch (err) {
          console.error("Backup saved but metadata update failed:", err);
        }
      });

      // Pipe archive into response
      archive.pipe(res);

      // Add the dumped directory contents to the archive root
      // `directory(source, dest)` where dest is false/'' to place contents at archive root
      archive.directory(tmpDir + path.sep, false);

      // finalize archive (this starts streaming)
      try {
        await archive.finalize();
      } catch (err: any) {
        console.error("Failed to finalize archive:", err);
        // if headers not sent, send 500; otherwise destroy
        try {
          if (!res.headersSent) {
            res.status(500).json({
              error: "Failed to finalize archive",
              details: String(err),
            });
          } else {
            res.destroy(err);
          }
        } catch (e) {}
        safeRmDir(tmpDir);
      }
    });
  } catch (err: any) {
    console.error("Unexpected error in /backup:", err);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ message: "Internal server error", details: String(err) });
    } else {
      res.destroy(err);
    }
  }
});

/**
 * Get database status (connected, size, records count)
 */
router.get("/status", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const size = await prisma.$queryRaw<{ size: string }[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;

    const patientsCount = await storage.getTotalPatientCount();
    const lastBackup = await storage.getLastBackup(userId);

    res.json({
      connected: true,
      size: size[0]?.size,
      patients: patientsCount,
      lastBackup: lastBackup?.createdAt ?? null,
    });
  } catch (err) {
    console.error("Status error:", err);
    res.status(500).json({
      connected: false,
      error: "Could not fetch database status",
    });
  }
});

// ==============================
// Backup Destination CRUD
// ==============================

// CREATE / UPDATE destination
router.post("/destination", async (req, res) => {
  const userId = req.user?.id;
  const { path: destinationPath } = req.body;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!destinationPath)
    return res.status(400).json({ error: "Path is required" });

  // validate path exists
  if (!fs.existsSync(destinationPath)) {
    return res.status(400).json({
      error: "Backup path does not exist or drive not connected",
    });
  }

  try {
    const destination = await storage.createBackupDestination(
      userId,
      destinationPath
    );
    res.json(destination);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save backup destination" });
  }
});

// GET all destinations
router.get("/destination", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const destinations = await storage.getAllBackupDestination(userId);
  res.json(destinations);
});

// UPDATE destination
router.put("/destination/:id", async (req, res) => {
  const userId = req.user?.id;
  const id = Number(req.params.id);
  const { path: destinationPath } = req.body;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!destinationPath)
    return res.status(400).json({ error: "Path is required" });

  if (!fs.existsSync(destinationPath)) {
    return res.status(400).json({ error: "Path does not exist" });
  }

  const updated = await storage.updateBackupDestination(
    id,
    userId,
    destinationPath
  );

  res.json(updated);
});

// DELETE destination
router.delete("/destination/:id", async (req, res) => {
  const userId = req.user?.id;
  const id = Number(req.params.id);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await storage.deleteBackupDestination(id, userId);
  res.json({ success: true });
});

router.post("/backup-path", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const destination = await storage.getActiveBackupDestination(userId);
  if (!destination) {
    return res.status(400).json({
      error: "No backup destination configured",
    });
  }

  if (!fs.existsSync(destination.path)) {
    return res.status(400).json({
      error:
        "Backup destination not found. External drive may be disconnected.",
    });
  }

  const filename = `dental_backup_${Date.now()}.zip`;

  try {
    await backupDatabaseToPath({
      destinationPath: destination.path,
      filename,
    });

    await storage.createBackup(userId);
    await storage.deleteNotificationsByType(userId, "BACKUP");

    res.json({ success: true, filename });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Backup to destination failed",
      details: err.message,
    });
  }
});

export default router;
