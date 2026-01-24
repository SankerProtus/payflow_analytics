import crypto from "crypto";
import { getDBConnection } from "../db/connection.js";
import { sendEmail } from "../mail/email.service.js";
import {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
} from "../mail/emailTemplates.js";
import { logger } from "../utils/logger.js";

export const createEmailVerificationToken = async (userId, client = null) => {
  const db = client || getDBConnection();

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  await db.query(
    `INSERT INTO email_verifications (user_id, token, expires_at, used)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashedToken, expiresAt, false],
  );

  return rawToken; // send ONLY raw token to email
};

export const sendVerificationEmail = async (email, token) => {
  try {
    const verificationLink = `${process.env.CLIENT_URL}/verify-account?token=${token}`;
    await sendEmail({
      to: email,
      subject: "PayFlow Analytics - Email Verification.",
      html: verificationEmailTemplate(verificationLink),
    });

    logger.info(`[VERIFY EMAIL] Verification email sent to: ${email}`);
  } catch (err) {
    logger.error("[EMAIL SENDING ERROR] Email sending error: ", {
      email: email.replace(/(.{3}).*(@.*)/, "$1******$2"),
      error: err.message,
    });

    throw err;
  }
};

export const sendPasswordResetEmail = async (toEmail, token) => {
  try {
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: toEmail,
      subject: "PayFlow Analytics - Password Reset Request",
      html: passwordResetEmailTemplate(resetLink),
    });

    logger.info(
      `[PASSWORD RESET EMAIL] Password reset email sent to: ${toEmail}`,
    );
  } catch (err) {
    logger.error("[EMAIL SENDING ERROR] Email sending error: ", {
      email: toEmail.replace(/(.{3}).*(@.*)/, "$1******$2"),
      error: err.message,
    });
  }
};

export const verifyEmailToken = async (token) => {
  const db = getDBConnection();

  try {
    const result = await db.query(
      "SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1",
      [token],
    );

    if (result.rowCount === 0) return null;

    const { user_id, expires_at } = result.rows[0];

    if (new Date() > expires_at) return null;

    return user_id;
  } catch (err) {
    logger.error("[VERIFY EMAIL TOKEN] Verification token error: ", { err });
    throw new Error("Failed to verify email token");
  }
};

export const markEmailAsVerified = async (userId) => {
  const db = getDBConnection();

  await db.query("BEGIN");

  try {
    await db.query("UPDATE users SET is_email_verified = TRUE WHERE id = $1", [
      userId,
    ]);

    await db.query("DELETE FROM email_verifications WHERE user_id = $1", [
      userId,
    ]);

    await db.query("COMMIT");
    logger.info(
      `[MARK EMAIL AS VERIFIED] Email marked as verified for user ID: ${userId}`,
    );
  } catch (err) {
    await db.query("ROLLBACK");
    logger.error("[MARK EMAIL AS VERIFIED ERROR] Email marking error: ", {
      err,
    });
    throw err;
  }
};

/**
 * Creates a secure password reset token for a user
 * @param {string} email - User's email address
 * @param {object} client - Optional database client for transaction management
 * @returns {Promise<string>} Raw token to be sent via email
 */
export const createPasswordResetToken = async (email, client = null) => {
  const db = client || getDBConnection();
  const useTransaction = !client;

  try {
    if (useTransaction) await db.query("BEGIN");

    // Check if user exists
    const userResult = await db.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (userResult.rowCount === 0) {
      // Don't reveal if email exists - throw generic error
      if (useTransaction) await db.query("ROLLBACK");
      throw new Error("If this email exists, a reset link will be sent.");
    }

    const userId = userResult.rows[0].id;

    // Invalidate any existing password reset tokens for this user
    await db.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);

    // Generate cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store hashed token in database
    await db.query(
      `INSERT INTO password_resets (user_id, token, expires_at, used)
       VALUES ($1, $2, $3, $4)`,
      [userId, hashedToken, expiresAt, false],
    );

    if (useTransaction) await db.query("COMMIT");

    logger.info(`[PASSWORD RESET TOKEN] Token created for user: ${userId}`);

    // Return raw token (to be sent via email)
    return rawToken;
  } catch (err) {
    if (useTransaction) await db.query("ROLLBACK");
    logger.error("[PASSWORD RESET TOKEN ERROR] Token creation error: ", {
      error: err.message,
    });
    throw err;
  }
};

/**
 * Verifies a password reset token
 * @param {string} token - Raw token from email link
 * @returns {Promise<string|null>} User ID if valid, null otherwise
 */
export const verifyPasswordResetToken = async (token) => {
  const db = getDBConnection();

  try {
    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const result = await db.query(
      `SELECT user_id, expires_at, used
       FROM password_resets
       WHERE token = $1`,
      [hashedToken],
    );

    if (result.rowCount === 0) {
      logger.warn("[PASSWORD RESET] Invalid token provided");
      return null;
    }

    const { user_id, expires_at, used } = result.rows[0];

    // Check if token has already been used
    if (used) {
      logger.warn(`[PASSWORD RESET] Token already used for user: ${user_id}`);
      return null;
    }

    // Check if token has expired
    if (new Date() > new Date(expires_at)) {
      logger.warn(`[PASSWORD RESET] Expired token for user: ${user_id}`);
      return null;
    }

    return user_id;
  } catch (err) {
    logger.error("[PASSWORD RESET VERIFICATION ERROR] ", {
      error: err.message,
    });
    throw new Error("Failed to verify password reset token");
  }
};

/**
 * Marks a password reset token as used and updates the user's password
 * @param {string} token - Raw token from email link
 * @param {string} newPasswordHash - New hashed password
 * @returns {Promise<boolean>} Success status
 */
export const resetPassword = async (token, newPasswordHash) => {
  const db = getDBConnection();

  await db.query("BEGIN");

  try {
    // Verify token and get user ID
    const userId = await verifyPasswordResetToken(token);

    if (!userId) {
      await db.query("ROLLBACK");
      return false;
    }

    // Update user's password
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      newPasswordHash,
      userId,
    ]);

    // Mark token as used
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    await db.query("UPDATE password_resets SET used = TRUE WHERE token = $1", [
      hashedToken,
    ]);

    // Delete old password reset tokens for this user
    await db.query(
      "DELETE FROM password_resets WHERE user_id = $1 AND token != $2",
      [userId, hashedToken],
    );

    await db.query("COMMIT");

    logger.info(
      `[PASSWORD RESET] Password successfully reset for user: ${userId}`,
    );
    return true;
  } catch (err) {
    await db.query("ROLLBACK");
    logger.error("[PASSWORD RESET ERROR] ", {
      error: err.message,
    });
    throw err;
  }
};
