import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "./middlewares/error.middleware";
import { apiLogger } from "./middlewares/logger.middleware";
import authRoutes from "./routes/auth";
import { authenticateJWT } from "./middlewares/auth.middleware";
import dotenv from "dotenv";
import { startBackupCron } from "./cron/backupCheck";

dotenv.config();
const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data
app.use(apiLogger);

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api", authenticateJWT, routes);

app.use(errorHandler);

//startig cron job
startBackupCron();

export default app;
