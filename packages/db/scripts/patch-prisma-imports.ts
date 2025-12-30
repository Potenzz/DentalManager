#!/usr/bin/env ts-node
/**
 * patch-prisma-imports.ts (SAFE)
 *
 * - Converts value-level imports/exports of `Prisma` -> type-only imports/exports
 *   (splits mixed imports).
 * - Replaces runtime usages of `Prisma.Decimal` -> `Decimal`.
 * - Ensures exactly one `import Decimal from "decimal.js";` per file.
 * - DEDICATED: only modifies TypeScript source files (.ts/.tsx).
 * - SKIPS: files under packages/db/generated/prisma (the Prisma runtime package).
 *
 * Usage:
 *   npx ts-node packages/db/scripts/patch-prisma-imports.ts
 *
 * Run after `prisma generate` (and make sure generated runtime .js are restored
 * if they were modified — see notes below).
 */

import fs from "fs";
import path from "path";
import fg from "fast-glob";

const repoRoot = process.cwd();
const GENERATED_FRAGMENT = path.join("packages", "db", "generated", "prisma");

// Only operate on TS sources (do NOT touch .js)
const GLOBS = [
  "packages/db/shared/**/*.ts",
  "packages/db/shared/**/*.tsx",
  "packages/db/generated/**/*.ts",
  "packages/db/generated/**/*.tsx",
];

// -------------------- helpers --------------------

function isFromGeneratedPrisma(fromPath: string) {
  // match relative imports that include generated/prisma
  return (
    fromPath.includes("generated/prisma") ||
    fromPath.includes("/generated/prisma") ||
    fromPath.includes("\\generated\\prisma")
  );
}

function splitSpecifiers(list: string) {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildNamedImport(specs: string[]) {
  return `{ ${specs.join(", ")} }`;
}

function extractDecimalLines(src: string) {
  const lines = src.split(/\r?\n/);
  const matches: number[] = [];

  const regexes = [
    /^import\s+Decimal\s+from\s+['"]decimal\.js['"]\s*;?/,
    /^import\s+\{\s*Decimal\s*\}\s+from\s+['"]decimal\.js['"]\s*;?/,
    /^import\s+\*\s+as\s+Decimal\s+from\s+['"]decimal\.js['"]\s*;?/,
    /^(const|let|var)\s+Decimal\s*=\s*require\(\s*['"]decimal\.js['"]\s*\)\s*;?/,
    /^(const|let|var)\s+Decimal\s*=\s*require\(\s*['"]decimal\.js['"]\s*\)\.default\s*;?/,
  ];

  lines.forEach((line, i) => {
    for (const re of regexes) {
      if (re.test(line)) {
        matches.push(i);
        break;
      }
    }
  });

  return { lines, matches };
}

function ensureSingleDecimalImport(src: string) {
  const { lines, matches } = extractDecimalLines(src);

  if (matches.length === 0) return src;

  // remove all matched import/require lines
  // do in reverse index order to keep indices valid
  matches
    .slice()
    .sort((a, b) => b - a)
    .forEach((idx) => lines.splice(idx, 1));

  let result = lines.join("\n");

  // insert single canonical import if missing
  if (!/import\s+Decimal\s+from\s+['"]decimal\.js['"]/.test(result)) {
    const importBlockMatch = result.match(/^(?:\s*import[\s\S]*?;\r?\n)+/);
    if (importBlockMatch && importBlockMatch.index !== undefined) {
      const idx = importBlockMatch[0].length;
      result =
        result.slice(0, idx) +
        `\nimport Decimal from "decimal.js";\n` +
        result.slice(idx);
    } else {
      result = `import Decimal from "decimal.js";\n` + result;
    }
  }

  // collapse excessive blank lines
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

function replacePrismaDecimalRuntime(src: string) {
  if (!/\bPrisma\.Decimal\b/.test(src)) return { out: src, changed: false };

  // mask import/export-from lines so we don't accidentally change them
  const placeholder =
    "__MASK_IMPORT_EXPORT__" + Math.random().toString(36).slice(2);
  const saved: string[] = [];

  const masked = src.replace(
    /(^\s*(?:import|export)\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?)/gm,
    (m) => {
      saved.push(m);
      return `${placeholder}${saved.length - 1}__\n`;
    }
  );

  const replaced = masked.replace(/\bPrisma\.Decimal\b/g, "Decimal");

  const restored = replaced.replace(
    new RegExp(`${placeholder}(\\d+)__\\n`, "g"),
    (_m, i) => saved[Number(i)] || ""
  );

  return { out: restored, changed: true };
}

// -------------------- patching logic --------------------

function patchFileContent(src: string, filePath: string) {
  // safety: do not edit runtime prisma package files
  const normalized = path.normalize(filePath);
  if (normalized.includes(path.normalize(GENERATED_FRAGMENT))) {
    // skip any files inside packages/db/generated/prisma
    return { out: src, changed: false, skipped: true };
  }

  let out = src;
  let changed = false;

  // 1) Named imports
  out = out.replace(
    /import\s+(?!type)(\{[^}]+\})\s+from\s+(['"])([^'"]+)\2\s*;?/gm,
    (match, specBlock: string, q: string, fromPath: string) => {
      if (!isFromGeneratedPrisma(fromPath)) return match;

      const specList = specBlock.replace(/^\{|\}$/g, "").trim();
      const specs = splitSpecifiers(specList);

      const prismaEntries = specs.filter((s) =>
        /^\s*Prisma(\s+as\s+\w+)?\s*$/.test(s)
      );
      const otherEntries = specs.filter(
        (s) => !/^\s*Prisma(\s+as\s+\w+)?\s*$/.test(s)
      );

      if (prismaEntries.length === 0) return match;

      changed = true;
      let replacement = `import type ${buildNamedImport(prismaEntries)} from ${q}${fromPath}${q};`;
      if (otherEntries.length > 0) {
        replacement += `\nimport ${buildNamedImport(otherEntries)} from ${q}${fromPath}${q};`;
      }
      return replacement;
    }
  );

  // 2) Named exports
  out = out.replace(
    /export\s+(?!type)(\{[^}]+\})\s+from\s+(['"])([^'"]+)\2\s*;?/gm,
    (match, specBlock: string, q: string, fromPath: string) => {
      if (!isFromGeneratedPrisma(fromPath)) return match;

      const specList = specBlock.replace(/^\{|\}$/g, "").trim();
      const specs = splitSpecifiers(specList);

      const prismaEntries = specs.filter((s) =>
        /^\s*Prisma(\s+as\s+\w+)?\s*$/.test(s)
      );
      const otherEntries = specs.filter(
        (s) => !/^\s*Prisma(\s+as\s+\w+)?\s*$/.test(s)
      );

      if (prismaEntries.length === 0) return match;

      changed = true;
      let replacement = `export type ${buildNamedImport(prismaEntries)} from ${q}${fromPath}${q};`;
      if (otherEntries.length > 0) {
        replacement += `\nexport ${buildNamedImport(otherEntries)} from ${q}${fromPath}${q};`;
      }
      return replacement;
    }
  );

  // 3) Namespace imports
  out = out.replace(
    /import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+(['"])([^'"]+)\2\s*;?/gm,
    (match, ns: string, q: string, fromPath: string) => {
      if (!isFromGeneratedPrisma(fromPath)) return match;
      changed = true;
      return `import type * as ${ns} from ${q}${fromPath}${q};`;
    }
  );

  // 4) Default imports
  out = out.replace(
    /import\s+(?!type)([A-Za-z0-9_$]+)\s+from\s+(['"])([^'"]+)\2\s*;?/gm,
    (match, binding: string, q: string, fromPath: string) => {
      if (!isFromGeneratedPrisma(fromPath)) return match;
      changed = true;
      return `import type ${binding} from ${q}${fromPath}${q};`;
    }
  );

  // 5) Replace Prisma.Decimal -> Decimal safely
  if (/\bPrisma\.Decimal\b/.test(out)) {
    const { out: decimalOut, changed: decimalChanged } =
      replacePrismaDecimalRuntime(out);
    out = decimalOut;
    if (decimalChanged) changed = true;
    // Ensure a single Decimal import exists
    out = ensureSingleDecimalImport(out);
  }

  return { out, changed, skipped: false };
}

// -------------------- runner --------------------

async function run() {
  const files = await fg(GLOBS, { absolute: true, cwd: repoRoot, dot: true });
  if (!files || files.length === 0) {
    console.warn(
      "No files matched. Check the GLOBS patterns and run from repo root."
    );
    return;
  }

  for (const file of files) {
    try {
      const src = fs.readFileSync(file, "utf8");
      const { out, changed, skipped } = patchFileContent(src, file);
      if (skipped) {
        // intentionally skipped runtime-prisma files
        continue;
      }
      if (changed && out !== src) {
        fs.writeFileSync(file, out, "utf8");
        console.log("patched:", path.relative(repoRoot, file));
      }
    } catch (err) {
      console.error("failed patching", file, err);
    }
  }

  console.log("done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
