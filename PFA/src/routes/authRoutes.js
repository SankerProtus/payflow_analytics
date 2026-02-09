import express from "express";
import { authController } from "../controller/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { Limiters } from "../middlewares/Limiters.js";
import "../configs/rateLimitStore.js";

export const authRoutes = express.Router();

// Apply rate limiters based on authentication status
authRoutes.use((req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    Limiters.authenticatedLimiter(req, res, next);
  } else {
    Limiters.authLimiter(req, res, next);
  }
});

authRoutes.post("/signup", authController.signup);
authRoutes.post("/login", Limiters.loginLimiter, authController.login);
authRoutes.post("/logout", authMiddleware, authController.logout);
authRoutes.post("/forgot-password", authController.passwordReset);
authRoutes.post("/reset-password", authController.resetPasswordHandler);
authRoutes.post("/verify-email", authController.verifyEmail);
authRoutes.post("/resend-verification", authController.resendVerificationEmail);
authRoutes.get("/profile", authMiddleware, authController.getProfile);
authRoutes.put("/profile", authMiddleware, authController.updateProfile);
authRoutes.put("/password", authMiddleware, authController.updatePassword);
