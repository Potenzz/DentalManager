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

    // create a unique tmp directory for directory-format dump
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental_backup_")); // MUST

    // choose archive extension per platform
    const isWin = process.platform === "win32";
    const archiveName = isWin
      ? `dental_backup_${Date.now()}.zip`
      : `dental_backup_${Date.now()}.tar.gz`;
    const archivePath = path.join(os.tmpdir(), archiveName);

    // ensure archivePath is not inside tmpDir (very important)
    if (archivePath.startsWith(tmpDir) || tmpDir.startsWith(archivePath)) {
      // place archive in parent tmp to be safe
      const safeDir = path.join(os.tmpdir(), "dental_backups");
      try {
        fs.mkdirSync(safeDir, { recursive: true, mode: 0o700 });
      } catch {}
      // recompute archivePath
      const safeArchivePath = path.join(safeDir, archiveName);
      // overwrite archivePath with safe location
      // (note: might require permission to write to safeDir)
      (global as any).__archivePathOverride = safeArchivePath;
    }

    const finalArchivePath =
      (global as any).__archivePathOverride || archivePath;

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
    let errorMessage = "";

    pgDump.stderr.on("data", (chunk) => {
      errorMessage += chunk.toString();
    });

    // handle spawn error immediately
    pgDump.on("error", (err) => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      console.error("Failed to start pg_dump:", err);
      return res
        .status(500)
        .json({ error: "Failed to run pg_dump", details: err.message });
    });

    // when pg_dump ends
    pgDump.on("close", (code) => {
      if (code !== 0) {
        // cleanup tmpDir
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
        console.error("pg_dump failed:", errorMessage || `exit ${code}`);
        return res.status(500).json({
          error: "Backup failed",
          details: errorMessage || `pg_dump exited with ${code}`,
        });
      }

      // SUCCESS: create a single tar.gz archive of the dump directory (so we can stream one file)
      let archiver;
      let archStderr = "";

      if (isWin) {
        // Use PowerShell Compress-Archive on Windows (creates .zip)
        // Use -Force to overwrite archive if it exists
        // Protect paths by wrapping in double quotes
        const psCmd = `Compress-Archive -Path "${tmpDir}\\*" -DestinationPath "${finalArchivePath}" -Force`;
        archiver = spawn("powershell.exe", ["-NoProfile", "-Command", psCmd], {
          env: process.env,
        });
      } else {
        // POSIX: use tar to create gzipped tarball
        archiver = spawn("tar", ["-czf", finalArchivePath, "-C", tmpDir, "."]);
      }

      archiver.stderr.on("data", (chunk) => {
        archStderr += chunk.toString();
      });

      archiver.on("error", (err) => {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
        console.error("Failed to start archiver:", err);
        return res
          .status(500)
          .json({ error: "Failed to archive backup", details: err.message });
      });

      archiver.on("close", (archCode) => {
        // remove tmpDir now that archive attempt finished
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (e) {}

        if (archCode !== 0) {
          console.error(
            "Archiver exited with",
            archCode,
            "stderr:",
            archStderr
          );
          try {
            fs.unlinkSync(finalArchivePath);
          } catch (e) {}
          return res.status(500).json({
            error: "Failed to create backup archive",
            details: archStderr || `archiver exited with code ${archCode}`,
          });
        }

        // Stream the archive to the client
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${path.basename(finalArchivePath)}`
        );
        res.setHeader(
          "Content-Type",
          isWin ? "application/zip" : "application/gzip"
        );

        const fileStream = fs.createReadStream(finalArchivePath);
        fileStream.pipe(res);

        // when the response finishes (success)
        res.once("finish", async () => {
          // cleanup archive
          try {
            fs.unlinkSync(finalArchivePath);
          } catch (_) {}

          // update metadata (fire-and-forget, but we await to log failures)
          try {
            await storage.createBackup(userId);
            await storage.deleteNotificationsByType(userId, "BACKUP");
          } catch (err) {
            console.error("Backup saved but metadata update failed:", err);
          }
        });

        // if client disconnects or error in streaming
        res.once("close", () => {
          // ensure archive removed
          try {
            fs.unlinkSync(finalArchivePath);
          } catch (_) {}
        });

        fileStream.on("error", (err) => {
          console.error("Error streaming archive:", err);
          try {
            fs.unlinkSync(finalArchivePath);
          } catch (_) {}
          if (!res.headersSent)
            res.status(500).json({ error: "Error streaming backup" });
        });
      }); // archiver.on close
    }); // pgDump.on close
  } catch (err: any) {
    console.error("Unexpected error:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Internal server error", details: String(err) });
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
