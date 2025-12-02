import dotenv from "dotenv";
dotenv.config();

type AnyFn = new (...a: any[]) => any;
let PrismaClientCtor: AnyFn | undefined;

// --- load generated or installed PrismaClient ctor ---
try {
  // prefer the local generated client in the monorepo
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const local = require("../generated/prisma");
  PrismaClientCtor =
    local.PrismaClient ||
    local.default ||
    (typeof local === "function" ? local : undefined);
} catch (e) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const installed = require("@prisma/client");
    PrismaClientCtor =
      installed.PrismaClient ||
      installed.default ||
      (typeof installed === "function" ? installed : undefined);
  } catch (e2) {
    throw new Error(
      "Unable to load PrismaClient from local generated client or @prisma/client. Run `npm run db:generate` and ensure the generated client exists."
    );
  }
}

if (!PrismaClientCtor) {
  throw new Error(
    "PrismaClient constructor not found in loaded prisma package."
  );
}

type PrismaClientType = InstanceType<typeof PrismaClientCtor>;
const globalForPrisma = global as unknown as { prisma?: PrismaClientType };

// --- robust adapter loader & diagnostics ---
function tryLoadPgAdapter() {
  try {
    // require the package
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const mod = require("@prisma/adapter-pg");

    // possible export names we've seen in docs / examples
    const candidates = [
      "PrismaPg",
      "PrismaPgAdapter",
      "PrismaPgAdapterDefault",
      "default",
    ];

    for (const name of candidates) {
      const candidate = (mod &&
        (mod[name] || (name === "default" && mod.default))) as any;
      if (typeof candidate === "function") {
        return { ctor: candidate, usedExport: name, module: mod };
      }
    }

    // if module itself is a ctor (commonjs default export)
    if (typeof mod === "function") {
      return { ctor: mod, usedExport: "moduleAsCtor", module: mod };
    }

    // no usable export found
    return { ctor: undefined, usedExport: undefined, module: mod };
  } catch (err: any) {
    return { error: err };
  }
}

function createPgAdapterInstance(ctor: any) {
  const dbUrl = process.env.DATABASE_URL;
  // different adapter versions accept different option names; attempt common ones
  const tryOptions = [
    { connectionString: dbUrl },
    { url: dbUrl },
    { connectionString: dbUrl || "" },
    { url: dbUrl || "" },
  ];

  for (const opts of tryOptions) {
    try {
      const inst = new ctor(opts);
      return { instance: inst, optsUsed: opts };
    } catch (err) {
      // ignore and try next shape
    }
  }

  // final attempt: no args
  try {
    return { instance: new ctor(), optsUsed: null };
  } catch (err) {
    return { instance: undefined };
  }
}

// Try to load adapter only for Postgres projects (your schema shows provider = "postgresql")
const adapterLoadResult = tryLoadPgAdapter();

if (adapterLoadResult.error) {
  // adapter package couldn't be required at all
  console.warn(
    "[prisma-adapter] require('@prisma/adapter-pg') failed:",
    adapterLoadResult.error.message || adapterLoadResult.error
  );
}

let adapter: any | undefined;

if (adapterLoadResult.ctor) {
  const { instance, optsUsed } = createPgAdapterInstance(
    adapterLoadResult.ctor
  );
  adapter = instance;
  // console.info("[prisma-adapter] Found adapter export:", adapterLoadResult.usedExport, "optsUsed:", optsUsed);
} else if (adapterLoadResult.module) {
  console.warn(
    "[prisma-adapter] module loaded but no ctor export found. Keys:",
    Object.keys(adapterLoadResult.module)
  );
}

// If adapter couldn't be constructed, fail loud — constructing PrismaClient without adapter on v7 causes obscure __internal errors.
if (!adapter) {
  const missing = adapterLoadResult.error
    ? "package-not-installed"
    : "no-export-or-constructor";
  const msg = [
    "Prisma adapter for Postgres could not be created.",
    `reason=${missing}`,
    "To fix: ensure you have @prisma/adapter-pg installed in the package where this code runs and that its peer 'pg' (node-postgres) is resolvable.",
    "Examples:",
    "  npm install @prisma/adapter-pg pg",
    "or in monorepo: npm --workspace packages/db install @prisma/adapter-pg pg",
    "After installing, run: npm run db:generate and restart dev server.",
  ].join(" ");
  // throw so we don't instantiate PrismaClient and get the __internal crash
  throw new Error(msg);
}

// instantiate prisma with adapter
export const prisma =
  globalForPrisma.prisma || new PrismaClientCtor({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
