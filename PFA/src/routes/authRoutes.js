import express from "express";
import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger.js";
import { authController } from "../controller/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

export const authRoutes = express.Router();

// Redis setup for production
let rateLimitStore = undefined;

if (process.env.REDIS_URL) {
  try {
    const { default: RedisStore } = await import("rate-limit-redis");
    const { createClient } = await import("redis");

    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("error", (err) => {
      logger.error("Redis error", err);
    });

    await redisClient.connect();

    rateLimitStore = new RedisStore({
      prefix: "rlm_auth_",
      sendCommand: (...args) => redisClient.sendCommand(args),
    });

    logger.info("Rate limiting using Redis store");
  } catch (err) {
    logger.warn("Redis setup failed, using memory store for rate limiting", {
      error: err.message,
    });
  }
} else {
  logger.info(
    "Rate limiting using memory store (set REDIS_URL for production)",
  );
}

// Fix rate limiter logic to avoid conflicts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: rateLimitStore,
  handler: (req, res) => {
    logger.warn(
      `[SECURITY] Rate limit exceeded for IP: ${req.ip} on endpoint: ${req.originalUrl}`,
    );

    const retryAfter = Number(res.getHeader("Retry-After")) || 900;
    const minutes = Math.ceil(retryAfter / 60);

    res.status(429).json({
      message: `Too many requests. Please try again in ${minutes} minute${
        minutes !== 1 ? "s" : ""
      }.`,
      retryAfter,
    });
  },
  // Apply to only non-authenticated requests
  skip: (req) => {
    return req.isAuthenticated && req.isAuthenticated();
  },
});

const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  store: rateLimitStore,
  handler: (req, res) => {
    logger.warn(
      `[SECURITY] Authenticated rate limit exceeded for user ID: ${
        req.user ? req.user.id : "unknown"
      } on endpoint: ${req.originalUrl}`,
    );
    const retryAfter = Number(res.getHeader("Retry-After")) || 900;
    const minutes = Math.ceil(retryAfter / 60);
    res.status(429).json({
      message: `Too many requests. Please try again in ${minutes} minute${
        minutes !== 1 ? "s" : ""
      }.`,
      retryAfter,
    });
  },
  // Only apply to authenticated requests
  skip: (req) => {
    return !req.isAuthenticated || !req.isAuthenticated();
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: rateLimitStore,
  handler: (req, res) => {
    logger.warn(
      `[SECURITY] Login rate limit exceeded for IP: ${req.ip} on endpoint: ${req.originalUrl}`,
    );
    const retryAfter = Number(res.getHeader("Retry-After")) || 900;
    const minutes = Math.ceil(retryAfter / 60);
    res.status(429).json({
      message: `Too many login attempts. Please try again in ${minutes} minute${
        minutes !== 1 ? "s" : ""
      }.`,
      retryAfter,
    });
  },
});

// Apply rate limiters based on authentication status
authRoutes.use((req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    authenticatedLimiter(req, res, next);
  } else {
    authLimiter(req, res, next);
  }
});

authRoutes.post("/signup", authController.signup);
authRoutes.post("/login", loginLimiter, authController.login);
authRoutes.get("/google", authController.googleAuthController);
authRoutes.get("/google/secrets", authController.googleAuthCallback);
authRoutes.post("/logout", authController.logout);
authRoutes.post("/forgot-password", authController.passwordReset);
authRoutes.post("/verify", authController.verifyEmail);
authRoutes.post("/verify-email", authController.verifyEmail);
authRoutes.post("/refresh-token", authMiddleware, (req, res) => {
  res.json({ accessToken: req.accessToken });
});
authRoutes.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Hello from profile" });
});
