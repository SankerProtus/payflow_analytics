import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  debug: process.env.NODE_ENV === "development",
  logger: process.env.NODE_ENV === "development",
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error("[EMAIL TRANSPORTER] Configuration error:", {
      message: error.message,
      code: error.code,
    });
  } else {
    logger.info("[EMAIL TRANSPORTER] Email service is ready to send messages");
  }
});
