import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  const NODE_ENV = (
    process.env.NODE_ENV ||
    process.env.ENV ||
    "development"
  ).toLowerCase();

  const rawFrontendUrls =
    process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "";
  const FRONTEND_URLS = rawFrontendUrls
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // In dev: allow all origins
  // In prod: restrict to FRONTEND_URLS if provided
  const corsOrigin =
    NODE_ENV !== "production"
      ? true
      : FRONTEND_URLS.length > 0
      ? FRONTEND_URLS
      : false; // no origins allowed if none configured in prod

  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });

  // Optional: log low-level engine errors for debugging
  io.engine.on("connection_error", (err) => {
    console.error("Socket engine connection_error:", err);
  });

  return io;
}

export { io };
