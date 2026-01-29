import { transporter } from "./transporter.js";
import { logger } from "../utils/logger.js";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };
    const info = await transporter.sendMail(mailOptions);
    const emailPrefix = to.replace(/(.{3}).*(@.*)/, "$1******$2");
    logger.info(`[EMAIL SENT] Email sent to ${emailPrefix}:`, info)
    return info;
  } catch (error) {
    const emailPrefix = to.replace(/(.{3}).*(@.*)/, "$1******$2");
      logger.error(`[EMAIL SENDING ERROR] Failed to send email to ${emailPrefix}:`, error.message);
      throw new Error(`Email delivery failed: ${error.message}`);
  }
};
