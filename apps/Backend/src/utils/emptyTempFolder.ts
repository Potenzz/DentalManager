// ../utils/emptyTempFolder.ts
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";

/**
 * Remove EVERYTHING under the parent folder that contains filePath.
 * - Does NOT remove the parent folder itself (only its children).
 * - Uses fs.rm with recursive+force if available.
 * - Falls back to reliable manual recursion otherwise.
 * - Logs folder contents before and after.
 *
 * Throws on critical safety checks.
 */
export async function emptyFolderContainingFile(filePath?: string | null): Promise<void> {
  if (!filePath) return;

  const absFile = path.resolve(String(filePath));
  const folder = path.dirname(absFile);

  // Safety checks
  if (!folder) {
    throw new Error(`Refusing to clean: resolved folder empty for filePath=${filePath}`);
  }
  const parsed = path.parse(folder);
  if (folder === parsed.root) {
    throw new Error(`Refusing to clean root folder: ${folder}`);
  }
  const home = os.homedir();
  if (home && path.resolve(home) === path.resolve(folder)) {
    throw new Error(`Refusing to clean user's home directory: ${folder}`);
  }
  const base = path.basename(folder);
  if (!base || base.length < 2) {
    throw new Error(`Refusing to clean suspicious folder: ${folder}`);
  }

  console.log(`[cleanup] emptyFolderContainingFile called for filePath=${filePath}`);
  console.log(`[cleanup] target folder=${folder}`);

  // Read and log contents before
  let before: string[] = [];
  try {
    before = await fs.readdir(folder);
    console.log(`[cleanup] before (${before.length}):`, before);
  } catch (err) {
    console.error(`[cleanup] failed to read folder ${folder} before removal:`, err);
    // If we can't read, bail out (safety)
    throw err;
  }

  // Helper fallback: recursive remove
  async function recursiveRemove(p: string): Promise<void> {
    try {
      const st = await fs.lstat(p);
      if (st.isDirectory()) {
        const children = await fs.readdir(p);
        for (const c of children) {
          await recursiveRemove(path.join(p, c));
        }
        // remove directory after children removed
        try {
          await fs.rmdir(p);
        } catch (err) {
          // log and continue
          console.error(`[cleanup] rmdir failed for ${p}:`, err);
        }
      } else {
        try {
          await fs.unlink(p);
        } catch (err: any) {
          // On EPERM try chmod and retry once
          if (err.code === "EPERM" || err.code === "EACCES") {
            try {
              fsSync.chmodSync(p, 0o666);
              await fs.unlink(p);
            } catch (retryErr) {
              console.error(`[cleanup] unlink after chmod failed for ${p}:`, retryErr);
              throw retryErr;
            }
          } else if (err.code === "ENOENT") {
            // already gone — ignore
          } else {
            throw err;
          }
        }
      }
    } catch (err: any) {
      if (err.code === "ENOENT") return; // already gone
      // rethrow to allow caller to log
      throw err;
    }
  }

  // Remove everything under folder (each top-level entry)
  for (const name of before) {
    const full = path.join(folder, name);
    try {
      if (typeof (fs as any).rm === "function") {
        // Node >= 14.14/16+: use fs.rm with recursive & force
        await (fs as any).rm(full, { recursive: true, force: true });
        console.log(`[cleanup] removed (fs.rm): ${full}`);
      } else {
        // fallback
        await recursiveRemove(full);
        console.log(`[cleanup] removed (recursive): ${full}`);
      }
    } catch (err) {
      console.error(`[cleanup] failed to remove ${full}:`, err);
      // Try chmod and retry once for stubborn files
      try {
        if (fsSync.existsSync(full)) {
          console.log(`[cleanup] attempting chmod+retry for ${full}`);
          try {
            fsSync.chmodSync(full, 0o666);
            if (typeof (fs as any).rm === "function") {
              await (fs as any).rm(full, { recursive: true, force: true });
            } else {
              await recursiveRemove(full);
            }
            console.log(`[cleanup] removed after chmod: ${full}`);
            continue;
          } catch (retryErr) {
            console.error(`[cleanup] retry after chmod failed for ${full}:`, retryErr);
          }
        } else {
          console.log(`[cleanup] ${full} disappeared before retry`);
        }
      } catch (permErr) {
        console.error(`[cleanup] chmod/retry error for ${full}:`, permErr);
      }
      // continue to next entry even if this failed
    }
  }

  // Read and log contents after
  try {
    const after = await fs.readdir(folder);
    console.log(`[cleanup] after (${after.length}):`, after);
  } catch (err) {
    console.error(`[cleanup] failed to read folder ${folder} after removal:`, err);
  }

  console.log(`[cleanup] finished cleaning folder: ${folder}`);
}
