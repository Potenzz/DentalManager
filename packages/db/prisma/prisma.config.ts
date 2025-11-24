import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // if prisma.config.ts sits in the same folder as schema.prisma:
  schema: "schema.prisma", // or "prisma/schema.prisma" if config is at project root

  // required with the current Prisma types
  engine: "classic",

  datasource: {
    // use Prisma's env() helper instead of process.env for nicer types
    url: env("DATABASE_URL"),
  },
});
