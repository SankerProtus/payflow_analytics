import passport from "passport";
import { getDBConnection } from "../db/connection.js";
import {
  sanitizeInput,
  sanitizeEmail,
  validateEmail,
  validatePassword,
  hashPassword,
  comparePassword,
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
      const firstName = req.body?.firstName
        ? sanitizeInput(req.body.firstName)
        : null;
      const lastName = req.body?.lastName
        ? sanitizeInput(req.body.lastName)
        : null;
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

      //  Hash password
      const hashed = await hashPassword(password);

      await client.query("BEGIN");

      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, company_name, isVerified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, company_name`,
        [email, hashed, firstName, lastName, companyName, false],
      );

      const user = insertResult.rows[0];
      const token = await createEmailVerificationToken(user.id, client);

      //   Verify email
      try {
        await sendVerificationEmail(email, token);
        await client.query("COMMIT");
        const emailPrefix = email.replace(/(.{3}).*(@.*)/, "$1******$2");
        logger.info(
          `[VERIFY EMAIL] Verification email sent to: ${emailPrefix}`,
        );
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
          firstName: user.first_name,
          lastName: user.last_name,
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

  login: async (req, res, next) => {
    try {
      req.body.email = sanitizeEmail(req.body?.email);
      const db = getDBConnection();
      const email = req.body.email;

      // Normalize and validate IP address - handle IPv6 and proxy scenarios
      let ipAddress = req.ip || req.connection?.remoteAddress || null;
      let hasValidIp = false;

      if (ipAddress) {
        // Convert IPv6 loopback to IPv4
        if (ipAddress === "::1") ipAddress = "127.0.0.1";
        // Extract IPv4 from IPv6-mapped format (::ffff:192.168.1.1 -> 192.168.1.1)
        if (ipAddress.startsWith("::ffff:")) ipAddress = ipAddress.substring(7);

        // Validate IP format (basic validation for IPv4 and IPv6)
        const ipv4Regex =
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1)$/;

        if (ipv4Regex.test(ipAddress) || ipv6Regex.test(ipAddress)) {
          hasValidIp = true;
        } else {
          logger.warn(`[SECURITY] Invalid IP format detected: ${ipAddress}`);
          ipAddress = null;
        }
      }

      // Check for failed attempts in the last 15 minutes
      // SECURE: Only check IP-based rate limiting when we have a valid IP
      // Users without valid IPs rely solely on express-rate-limit middleware
      let failedAttempts = 0;

      if (hasValidIp) {
        const checkAttempts = await db.query(
          `SELECT COUNT(*) as count
           FROM failed_login_attempts
           WHERE ip_address = $1
           AND attempt_time > NOW() - INTERVAL '15 minutes'`,
          [ipAddress],
        );
        failedAttempts = parseInt(checkAttempts.rows[0].count, 10);
      } else {
        logger.warn(
          `[SECURITY] No valid IP for login attempt - relying on express-rate-limit only for: ${email?.replace(/(.{3}).*(@.*)/, "$1******$2")}`,
        );
      }

      if (failedAttempts >= 5) {
        logger.warn(
          `[LOGIN BLOCKED] Too many failed attempts from IP: ${ipAddress}`,
        );
        return res.status(429).json({
          message:
            "Too many failed login attempts. Please try again in 15 minutes.",
        });
      }

      passport.authenticate(
        "local",
        { session: false },
        async (err, user, info) => {
          if (err) return next(err);

          if (!user) {
            // Record failed login attempt
            try {
              const userQuery = await db.query(
                "SELECT id FROM users WHERE LOWER(email) = $1",
                [email.toLowerCase()],
              );

              const userId =
                userQuery.rowCount > 0 ? userQuery.rows[0].id : null;

              // SECURE: Only track IP-based failures when we have a valid IP
              // This prevents shared rate limit pools and DoS attacks
              if (hasValidIp && ipAddress) {
                await db.query(
                  `INSERT INTO failed_login_attempts (user_id, ip_address, attempt_time)
                 VALUES ($1, $2, NOW())`,
                  [userId, ipAddress],
                );

                logger.warn(
                  `[FAILED LOGIN] Failed login attempt for email: ${email.replace(/(.{3}).*(@.*)/, "$1******$2")} from IP: ${ipAddress}`,
                );
              } else {
                logger.warn(
                  `[FAILED LOGIN] Failed login attempt for email: ${email.replace(/(.{3}).*(@.*)/, "$1******$2")} from unknown IP (protected by express-rate-limit)`,
                );
              }
            } catch (insertErr) {
              logger.error("[FAILED LOGIN TRACKING ERROR]", {
                error: insertErr.message,
                stack: insertErr.stack,
              });
            }

            return res.status(400).json({
              message: info?.message || "Login failed. Please try again.",
            });
          }

          // Successful login
          // Clear failed attempts for this IP and user
          try {
            if (hasValidIp && ipAddress) {
              await db.query(
                `DELETE FROM failed_login_attempts
               WHERE ip_address = $1 OR user_id = $2`,
                [ipAddress, user.id],
              );
            } else {
              // Clear only user-based attempts if no valid IP
              await db.query(
                `DELETE FROM failed_login_attempts WHERE user_id = $1`,
                [user.id],
              );
            }
          } catch (deleteErr) {
            logger.error("[CLEAR FAILED ATTEMPTS ERROR]", {
              error: deleteErr.message,
            });
          }

          const token = generateToken(user);

          logger.info(
            `[LOGIN SUCCESS] User logged in: ${user.email.replace(/(.{3}).*(@.*)/, "$1******$2")}`,
          );

          return res.status(200).json({
            message: "Login successful. Redirecting to dashboard...",
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName || null,
              lastName: user.lastName || null,
              companyName: user.companyName || null,
            },
          });
        },
      )(req, res, next);
    } catch (err) {
      logger.error("[LOGIN ERROR]", {
        error: err.message,
        stack: err.stack,
        email:
          req.body?.email?.replace(/(.{3}).*(@.*)/, "$1******$2") || "unknown",
      });
      return res.status(500).json({
        message: "An error occurred during login. Please try again later.",
      });
    }
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

  resendVerificationEmail: async (req, res) => {
    const email = sanitizeEmail(req.body?.email);
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email address." });
    }
    try {
      const db = getDBConnection();
      const client = await db.connect();
      const userResult = await client.query(
        "SELECT id, isVerified FROM users WHERE email = $1",
        [email],
      );
      if (userResult.rowCount === 0) {
        return res
          .status(200)
          .json({ message: "Verification email resent if account exists." });
      }
      const user = userResult.rows[0];

      if (user.isverified) {
        return res.status(400).json({ message: "Email is already verified." });
      }
      const token = await createEmailVerificationToken(user.id, client);
      await sendVerificationEmail(email, token);
      const emailPrefix = email.replace(/(.{3}).*(@.*)/, "$1******$2");
      logger.info(
        `[RESEND VERIFY EMAIL] Verification email resent to: ${emailPrefix}`,
      );
      return res
        .status(200)
        .json({ message: "Verification email resent if account exists." });
    } catch (err) {
      logger.error("[RESEND VERIFY EMAIL ERROR] Resend verification error: ", {
        email: email.replace(/(.{3}).*(@.*)/, "$1***$2"),
        error: err.message,
      });
      return res.status(500).json({
        message: "Error resending verification email. Please try again later.",
      });
    }
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

      logger.info(
        `[PASSWORD RESET] Password reset email sent to: ${email.replace(/(.{3}).*(@.*)/, "$1******$2")}`,
      );

      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (err) {
      logger.error("[PASSWORD RESET ERROR] Password reset error: ", {
        email: email.replace(/(.{3}).*(@.*)/, "$1***$2"),
        error: err.message,
      });

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

      await db.query("DELETE FROM password_reset_tokens WHERE token = $1", [
        token,
      ]);

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

  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const db = getDBConnection();

      const result = await db.query(
        "SELECT id, email, first_name, last_name, company_name, created_at, isverified FROM users WHERE id = $1",
        [userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = result.rows[0];

      return res.status(200).json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        createdAt: user.created_at,
        isVerified: user.isverified,
      });
    } catch (err) {
      logger.error("[GET PROFILE ERROR] ", {
        userId: req.user?.id,
        error: err.message,
      });

      return res.status(500).json({
        message: "Failed to fetch profile. Please try again later.",
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, companyName } = req.body;

      if (!firstName || !firstName.trim()) {
        return res.status(400).json({ message: "First name is required." });
      }

      const sanitizedFirstName = sanitizeInput(firstName);
      const sanitizedLastName = lastName ? sanitizeInput(lastName) : null;
      const sanitizedCompanyName = companyName
        ? sanitizeInput(companyName)
        : null;

      const db = getDBConnection();

      const result = await db.query(
        "UPDATE users SET first_name = $1, last_name = $2, company_name = $3 WHERE id = $4 RETURNING id, email, first_name, last_name, company_name, isverified",
        [sanitizedFirstName, sanitizedLastName, sanitizedCompanyName, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = result.rows[0];

      logger.info("[UPDATE PROFILE] Profile updated successfully", {
        userId,
      });

      return res.status(200).json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        isVerified: user.isverified,
      });
    } catch (err) {
      logger.error("[UPDATE PROFILE ERROR] ", {
        userId: req.user?.id,
        error: err.message,
      });

      return res.status(500).json({
        message: "Failed to update profile. Please try again later.",
      });
    }
  },

  updatePassword: async (req, res) => {
    let client = null;

    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Current password and new password are required.",
        });
      }

      if (!validatePassword(newPassword)) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters and include mixed case + number.",
        });
      }

      const db = getDBConnection();
      client = await db.connect();

      // Get user's current password
      const userResult = await client.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = userResult.rows[0];

      // Verify current password
      const isPasswordValid = await comparePassword(
        currentPassword,
        user.password_hash,
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Current password is incorrect.",
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        hashedPassword,
        userId,
      ]);

      logger.info("[UPDATE PASSWORD] Password updated successfully", {
        userId,
      });

      return res.status(200).json({
        message: "Password updated successfully.",
      });
    } catch (err) {
      logger.error("[UPDATE PASSWORD ERROR] ", {
        userId: req.user?.id,
        error: err.message,
      });

      return res.status(500).json({
        message: "Failed to update password. Please try again later.",
      });
    } finally {
      if (client) client.release();
    }
  },
};
