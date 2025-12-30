import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import archiver from "archiver";

function safeRmDir(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

interface BackupToPathParams {
  destinationPath: string;
  filename: string;
}

export async function backupDatabaseToPath({
  destinationPath,
  filename,
}: BackupToPathParams): Promise<void> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental_backup_"));

  return new Promise((resolve, reject) => {
    const pgDump = spawn(
      "pg_dump",
      [
        "-Fd",
        "-j",
        "4",
        "--no-acl",
        "--no-owner",
        "-h",
        process.env.DB_HOST || "localhost",
        "-U",
        process.env.DB_USER || "postgres",
        process.env.DB_NAME || "dental_db",
        "-f",
        tmpDir,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD,
        },
      }
    );

    let pgError = "";

    pgDump.stderr.on("data", (d) => (pgError += d.toString()));

    pgDump.on("close", async (code) => {
      if (code !== 0) {
        safeRmDir(tmpDir);
        return reject(new Error(pgError || "pg_dump failed"));
      }

      const outputFile = path.join(destinationPath, filename);
      const outputStream = fs.createWriteStream(outputFile);

      const archive = archiver("zip");

      outputStream.on("error", (err) => {
        safeRmDir(tmpDir);
        reject(err);
      });

      archive.on("error", (err) => {
        safeRmDir(tmpDir);
        reject(err);
      });

      archive.pipe(outputStream);
      archive.directory(tmpDir + path.sep, false);

      archive.finalize();

      archive.on("end", () => {
        safeRmDir(tmpDir);
        resolve();
      });
    });
  });
}
