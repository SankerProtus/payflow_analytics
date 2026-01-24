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

      if(password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });

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
    if (!req.isAuthenticated())
      return res.status(400).json({ message: "Not authenticated." });

    const { id } = req.user;

    req.logout((err) => {
      if (err) {
        logger.error("[LOGOUT ERROR] Logout error: ", {
          error: err.message || err.toString(),
        });
        return res.status(500).json({ message: "Logout failed." });
      }

      req.session.destroy((err) => {
        if (err) {
          logger.error("[SESSION DESTRUCTION] Session destruction error: ", {
            error: err.message || err.toString(),
          });
          return res.status(500).json({ message: "Logout failed." });
        }
      });

      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      res.clearCookie("jwt");

      logger.info(`[LOGOUT] User logged out: ${id}`);
      return res.status(200).json({ message: "Logout successful." });
    });
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
      // TODO: Implement createPasswordResetToken function
      const token = "temporary-token-placeholder";
      await sendPasswordResetEmail(email, token);
      logger.info(`Password reset email sent to: ${email}`);
      return res.json({ message: "Password reset email sent." });
    } catch (err) {
      logger.error("Password reset email error: ", {
        email: email.replace(/(.{3}).*(@.*)/, "$1***$2"),
        error: err.message,
      });
      return res
        .status(500)
        .json({ message: "Error sending password reset email." });
    }
  },
};
