import { rateLimit } from "express-rate-limit";
import { rateLimitStore } from "../configs/rateLimitStore.js";
import { logger } from "../utils/logger.js";

export const Limiters = {
    authLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
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
    }),
    authenticatedLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
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
    }),
    loginLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, 
        message: "Too many login attempts from this IP, please try again later.",
    }),
};