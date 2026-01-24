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
