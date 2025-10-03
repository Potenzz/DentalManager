import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";

/**
 * Remove EVERYTHING under the folder that contains `filePath`.
 * - Does NOT remove the folder itself (only its children).
 * - Uses fs.rm recursive/force when available, otherwise falls back to manual recursion.
 * - Logs actions and errors.
 *
 * Safety: refuses to operate on root or user's home, or suspicious very-short basenames.
 */
export async function emptyFolderContainingFile(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return;

  const absFile = path.resolve(String(filePath));
  const folder = path.dirname(absFile);

  // Basic safety checks
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

  const base = path.basename(folder).toLowerCase();
  if (!base || base.length < 2) {
    throw new Error(`Refusing to clean suspicious folder: ${folder}`);
  }

  console.log(`[cleanup] Cleaning contents of folder: ${folder}`);

  // Helper: manual recursive delete fallback if fs.rm isn't available
  async function recursiveRemoveFallback(p: string): Promise<void> {
    try {
      const st = await fs.lstat(p);
      if (st.isDirectory()) {
        const children = await fs.readdir(p);
        for (const child of children) {
          await recursiveRemoveFallback(path.join(p, child));
        }
        // try remove dir
        try {
          await fs.rmdir(p);
        } catch (err) {
          // directory might not be empty due to race; log and continue
          console.error(`[cleanup] rmdir failed for ${p}:`, err);
        }
      } else {
        // file or symlink or other -> unlink
        try {
          await fs.unlink(p);
        } catch (err) {
          // permission or other error; rethrow to let upper logic handle or log
          throw err;
        }
      }
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // already gone
        return;
      }
      throw err;
    }
  }

  // Read initial contents (for logging)
  let initialEntries: string[] = [];
  try {
    initialEntries = await fs.readdir(folder);
    console.log(`[cleanup] before: ${initialEntries.length} entries:`, initialEntries);
  } catch (err) {
    console.error(`[cleanup] failed to read folder ${folder}:`, err);
    throw err;
  }

  // Remove each top-level entry under the folder
  for (const name of initialEntries) {
    const full = path.join(folder, name);
    try {
      if (typeof (fs as any).rm === "function") {
        // Node supports fs.rm with recursive + force
        await (fs as any).rm(full, { recursive: true, force: true });
        console.log(`[cleanup] removed (rm): ${full}`);
      } else {
        // fallback
        await recursiveRemoveFallback(full);
        console.log(`[cleanup] removed (fallback): ${full}`);
      }
    } catch (err: any) {
      console.error(`[cleanup] initial remove failed for ${full}:`, err);

      // try to fix permissions and retry once
      try {
        // only attempt chmod if entry still exists
        if (fsSync.existsSync(full)) {
          try {
            fsSync.chmodSync(full, 0o666);
            if (typeof (fs as any).rm === "function") {
              await (fs as any).rm(full, { recursive: true, force: true });
            } else {
              await recursiveRemoveFallback(full);
            }
            console.log(`[cleanup] removed after chmod: ${full}`);
            continue;
          } catch (retryErr) {
            console.error(`[cleanup] remove after chmod failed for ${full}:`, retryErr);
          }
        } else {
          console.log(`[cleanup] ${full} no longer exists.`);
        }
      } catch (permErr) {
        console.error(`[cleanup] chmod/retry failed for ${full}:`, permErr);
      }

      // continue with other files even if this one failed
    }
  }

  // Final status read
  try {
    const final = await fs.readdir(folder);
    console.log(`[cleanup] after: ${final.length} entries remaining:`, final);
  } catch (err) {
    console.error(`[cleanup] failed to read folder after cleanup ${folder}:`, err);
  }

  console.log(`[cleanup] finished cleaning contents of folder: ${folder}`);
}
