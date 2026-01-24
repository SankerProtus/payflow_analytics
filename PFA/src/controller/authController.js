import passport from "passport";
import { getDBConnection } from "../db/connection.js";
import {
  sanitizeInput,
  sanitizeEmail,
  validateEmail,
  validatePassword,
  hashPassword,
  generateToken,
} from "../utils/validation.js";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
  verifyEmailToken,
  markEmailAsVerified,
  sendPasswordResetEmail,
  createPasswordResetToken,
  resetPassword,
} from "../service/emailVerification.service.js";
import { logger } from "../utils/logger.js";

export const authController = {
  signup: async (req, res, _next) => {
    let client = null;

    try {
      const db = getDBConnection();
      client = await db.connect();

      const email = sanitizeEmail(req.body?.email);
      const password = req.body?.password;
      const confirmPassword = req.body?.confirmPassword;
      const companyName = req.body?.companyName
        ? sanitizeInput(req.body.companyName)
        : null;

      if (!email || !password || !confirmPassword)
        return res
          .status(400)
          .json({ message: "Email and password are required." });

      if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      if (password !== confirmPassword)
        return res.status(400).json({ message: "Passwords do not match." });

      if (!validatePassword(password)) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters and include mixed case + number.",
        });
      }

      //   Check for user existence
      const existing = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );

      if (existing.rowCount > 0) {
        return res.status(400).json({ message: "Account already exists." });
      }

      const hashed = await hashPassword(password);

      await client.query("BEGIN");

      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, company_name) VALUES ($1, $2, $3) RETURNING id, email, company_name`,
        [email, hashed, companyName],
      );

      const user = insertResult.rows[0];
      const token = await createEmailVerificationToken(user.id, client);

      //   Verify email
      try {
        await sendVerificationEmail(email, token);
        await client.query("COMMIT");
        logger.info(`[VERIFY EMAIL] Verification email sent to: ${email}`);
      } catch (emailErr) {
        await client.query("ROLLBACK");
        logger.error("[EMAIL SENDING ERROR] Email sending error: ", {
          email: email.replace(/(.{3}).*(@.*)/, "$1******$2"),
          error: emailErr.message,
        });
        return res.status(500).json({
          message: "Error sending verification email. Please try again later.",
        });
      }

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          companyName: user.company_name,
        },
        message: "Registration successful. Please verify your email.",
      });
    } catch (err) {
      if (client) await client.query("ROLLBACK");
      logger.error("[REGISTRATION ERROR] Registration error: ", { error: err });
      res
        .status(500)
        .json({ message: "Registration failed. Please try again later." });
    } finally {
      if (client) client.release();
    }
  },

  login: (req, res, next) => {
    req.body.email = sanitizeEmail(req.body?.email);
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err) return next(err);

      if (!user)
        return res.status(400).json({
          message: info?.message || "Login failed. Please try again.",
        });

      const token = generateToken(user);

      return res.status(200).json({
        message: "Login successful. Redirecting to dashboard...",
        token,
        user: {
          id: user.id,
          email: user.email,
          companyName: user.companyName || null,
        },
      });
    })(req, res, next);
  },

  googleAuthController: passport.authenticate("google", {
    scope: ["profile", "email"],
  }),

  googleAuthCallback: (req, res, next) => {
    passport.authenticate(
      "google",
      { successRedirect: "/dashboard", failureRedirect: "/login" },
      function (err, user, _info) {
        if (err) return next(err);

        if (!user) return res.redirect("/login");

        req.login(user, function (err) {
          if (err) return next(err);

          return res.redirect("/dashboard");
        });
      },
    )(req, res, next);
  },

  logout: (req, res) => {
    if (!req.user) {
      return res.status(400).json({ message: "Not authenticated." });
    }

    const { id } = req.user;

    logger.info(`[LOGOUT] User logged out: ${id}`);
    return res.status(200).json({ message: "Logout successful." });
  },

  verifyEmail: async (req, res) => {
    const token = req.body?.token;
    if (!token)
      return res
        .status(400)
        .json({ message: "Verification token is required." });

    try {
      const userId = await verifyEmailToken(token);
      if (!userId)
        return res.status(400).json({ message: "Invalid or expired token." });

      await markEmailAsVerified(userId);
      logger.info(`[VERIFY EMAIL] Email verified for user ID: ${userId}`);
    } catch (err) {
      logger.error("[VERIFY EMAIL ERROR] Verification error: ", {
        error: err.message,
      });
      return res
        .status(500)
        .json({ message: "Error verifying email. Please try again later." });
    }

    return res.status(200).json({ message: "Email successfully verified." });
  },

  passwordReset: async (req, res) => {
    const email = sanitizeEmail(req.body?.email);
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    try {
      // Create secure password reset token
      const token = await createPasswordResetToken(email);

      // Send password reset email
      await sendPasswordResetEmail(email, token);

      logger.info(`[PASSWORD RESET] Password reset email sent to: ${email}`);

      // Always return success to prevent email enumeration attacks
      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (err) {
      logger.error("[PASSWORD RESET ERROR] Password reset error: ", {
        email: email.replace(/(.{3}).*(@.*)/, "$1***$2"),
        error: err.message,
      });

      // Return generic success message even on error to prevent email enumeration
      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }
  },

  resetPasswordHandler: async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required.",
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include mixed case + number.",
      });
    }

    try {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Reset password using token
      const success = await resetPassword(token, hashedPassword);

      if (!success) {
        return res.status(400).json({
          message: "Invalid or expired reset token.",
        });
      }

      logger.info("[PASSWORD RESET] Password successfully reset");

      return res.status(200).json({
        message: "Password has been reset successfully.",
      });
    } catch (err) {
      logger.error("[PASSWORD RESET HANDLER ERROR] ", {
        error: err.message,
      });

      return res.status(500).json({
        message: "Failed to reset password. Please try again later.",
      });
    }
  },
};
