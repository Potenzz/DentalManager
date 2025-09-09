import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = (
  process.env.NODE_ENV ||
  process.env.ENV ||
  "development"
).toLowerCase();
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, HOST, () => {
  console.log(
    `✅ Server running in ${NODE_ENV} mode at http://${HOST}:${PORT}`
  );
});

// Handle startup errors
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error("❌ Server failed to start:", err);
  }
  process.exit(1); // Exit with failure
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`⚡ Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    console.log("✅ HTTP server closed");

    // TODO: Close DB connections if needed
    // db.$disconnect().then(() => console.log("✅ Database disconnected"));

    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
