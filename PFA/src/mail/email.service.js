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
    logger.info(`[EMAIL SENT] Email sent to ${to}:`, info)
    return info;
  } catch (error) {
      logger.error(`[EMAIL SENDING ERROR] Failed to send email to ${to}:`, error.message);
      throw new Error(`Email delivery failed: ${error.message}`);
  }
};
