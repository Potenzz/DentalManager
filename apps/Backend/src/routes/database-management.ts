import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { prisma } from "@repo/db/client";
import { storage } from "../storage";

const router = Router();

/**
 * Create a database backup
 */

router.post("/backup", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const fileName = `dental_backup_${Date.now()}.dump`;
    const tmpFile = path.join(os.tmpdir(), fileName);

    // Spawn pg_dump
    const pgDump = spawn(
      "pg_dump",
      [
        "-Fc", // custom format
        "--no-acl",
        "--no-owner",
        "-h",
        process.env.DB_HOST || "localhost",
        "-U",
        process.env.DB_USER || "postgres",
        process.env.DB_NAME || "dental_db",
        "-f",
        tmpFile, // write directly to temp file
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD,
        },
      }
    );
    let errorMessage = "";

    pgDump.stderr.on("data", (chunk) => {
      errorMessage += chunk.toString();
    });

    pgDump.on("close", (code) => {
      if (code === 0) {
        // ✅ Send only if dump succeeded
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${fileName}`
        );
        res.setHeader("Content-Type", "application/octet-stream");

        const fileStream = fs.createReadStream(tmpFile);
        fileStream.pipe(res);

        fileStream.on("close", async () => {
          fs.unlink(tmpFile, () => {}); // cleanup temp file

          // ✅ Then, in background, update DB
          try {
            await storage.createBackup(userId);
            await storage.deleteNotificationsByType(userId, "BACKUP");
          } catch (err) {
            console.error("Backup saved but metadata update failed:", err);
          }
        });
      } else {
        console.error("pg_dump failed:", errorMessage);
        fs.unlink(tmpFile, () => {}); // cleanup
        res.status(500).json({
          error: "Backup failed",
          details: errorMessage || `pg_dump exited with code ${code}`,
        });
      }
    });

    pgDump.on("error", (err) => {
      console.error("Failed to start pg_dump:", err);
      fs.unlink(tmpFile, () => {});
      res.status(500).json({
        error: "Failed to run pg_dump",
        details: err.message,
      });
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal server error",
        details: String(err),
      });
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

    const size = await prisma.$queryRawUnsafe<{ size: string }[]>(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
    );

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

export default router;
