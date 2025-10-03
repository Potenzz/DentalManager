import fs from "fs/promises";
import path from "path";
import * as os from "os";

/**
 * Recursively delete files & symlinks under the parent folder of `filePath`.
 * Will remove subfolders only if they become empty.
 *
 * Safety checks:
 *  - Refuses to operate on root or extremely short folders.
 *  - Refuses to operate on the user's home directory.
 *
 * Throws on critical safety failure; otherwise logs and continues on per-file errors.
 */
export async function emptyFolderContainingFile(
  filePath: string | null | undefined
): Promise<void> {
  if (!filePath) return;

  const absFile = path.resolve(String(filePath));
  const folder = path.dirname(absFile);

  // Basic sanity / safety checks
  if (!folder) {
    throw new Error(
      `Refusing to clean: resolved folder is empty for filePath=${filePath}`
    );
  }

  const parsed = path.parse(folder);
  if (folder === parsed.root) {
    throw new Error(`Refusing to clean root folder: ${folder}`);
  }

  // Don't allow cleaning the user's home directory
  const home = os.homedir();
  if (home && path.resolve(home) === path.resolve(folder)) {
    throw new Error(`Refusing to clean user's home directory: ${folder}`);
  }

  // Heuristic: require folder basename length >= 2 (prevents cleaning very short names like '/a')
  const base = path.basename(folder).toLowerCase();
  if (!base || base.length < 2) {
    throw new Error(`Refusing to clean suspicious folder: ${folder}`);
  }

  // Now recursively walk and remove files & symlinks. Remove directories if empty after processing.
  async function removeContentsRecursively(dir: string): Promise<boolean> {
    // returns true if directory is empty (and therefore safe-to-delete by caller)
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error(`[cleanup] failed to read directory ${dir}:`, err);
      // If we can't read, don't attempt to delete it
      return false;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      try {
        if (entry.isFile() || entry.isSymbolicLink()) {
          await fs.unlink(full);
          console.log(`[cleanup] removed file/symlink: ${full}`);
        } else if (entry.isDirectory()) {
          // Recurse into subdirectory
          const subEmpty = await removeContentsRecursively(full);
          if (subEmpty) {
            // remove the now-empty directory
            try {
              await fs.rmdir(full);
              console.log(`[cleanup] removed empty directory: ${full}`);
            } catch (rmDirErr) {
              // Could fail due to permissions/race; log and continue
              console.error(
                `[cleanup] failed to remove directory ${full}:`,
                rmDirErr
              );
            }
          } else {
            // directory not empty (or had read error) — we leave it
            console.log(
              `[cleanup] left directory (not empty or read error): ${full}`
            );
          }
        } else {
          // Other types (socket, FIFO, etc.) — try unlink as fallback
          try {
            await fs.unlink(full);
            console.log(`[cleanup] removed special entry: ${full}`);
          } catch (unlinkErr) {
            console.error(
              `[cleanup] failed to remove special entry ${full}:`,
              unlinkErr
            );
          }
        }
      } catch (entryErr) {
        console.error(`[cleanup] error handling ${full}:`, entryErr);
        // continue with other entries
      }
    }

    // After processing entries, check if directory is now empty
    try {
      const after = await fs.readdir(dir);
      return after.length === 0;
    } catch (readAfterErr) {
      console.error(
        `[cleanup] failed to re-read directory ${dir}:`,
        readAfterErr
      );
      return false;
    }
  }

  // Start recursive cleaning at the folder (we do NOT delete the top folder itself,
  // only its contents; if you want the folder removed too, you can call fs.rmdir after)
  try {
    await removeContentsRecursively(folder);
    console.log(`[cleanup] finished cleaning contents of folder: ${folder}`);
  } catch (err) {
    console.error(
      `[cleanup] unexpected error while cleaning folder ${folder}:`,
      err
    );
    throw err;
  }
}
