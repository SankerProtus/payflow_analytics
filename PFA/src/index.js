import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import "./configs/passportConfig.js";
import { authRoutes } from "./routes/authRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { customerRoutes } from "./routes/customerRoutes.js";
import { dunningRoutes } from "./routes/dunningRoutes.js";
import { webhookRoutes } from "./routes/webhookRoutes.js";
import { closeDBConnection } from "./db/connection.js";
import { logger } from "./utils/logger.js";
import process from "process";
import passport from "passport";

const app = express();

app.use(passport.initialize());
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dunning", dunningRoutes);

process.on("SIGINT", async () => {
  logger.info("Gracefully shutting down...");
  await closeDBConnection();
  process.exit(0);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});
