import { Resend } from "resend";
import {
  getVerifiedEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordResetTemplate,
  getPaymentFailedTemplate,
  getPaymentSuccessTemplate,
  getSubscriptionCancelledTemplate,
  getInvoiceTemplate,
  getTrialEndingTemplate,
} from "./email.templates.js";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerifiedEmail = async (
  toEmail,
  verificationCode,
  username,
) => {
  try {
    const emailContent = getVerifiedEmailTemplate(verificationCode, username);

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: "Verify Your Email Address",
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }

    logger.info("Verification email sent successfully:", data);
    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    logger.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

export const sendWelcomeEmail = async (toEmail, username) => {
  try {
    const emailContent = getWelcomeEmailTemplate(toEmail, username);

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: "Welcome to PayFlow Analytics!",
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending welcome email:", error);
      throw new Error("Failed to send welcome email");
    }
    logger.info("Welcome email sent successfully:", data);
    return { success: true, message: "Welcome email sent successfully" };
  } catch (error) {
    logger.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
};

export const sendPasswordResetEmail = async (toEmail, resetToken, username) => {
  try {
    const emailContent = getPasswordResetTemplate(resetToken, username);

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: "Reset Your Password - PayFlow Analytics",
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending password reset email:", error);
      throw new Error("Failed to send password reset email");
    }

    logger.info("Password reset email sent successfully:", data);
    return { success: true, message: "Password reset email sent successfully" };
  } catch (error) {
    logger.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

export const sendPaymentFailedEmail = async (
  toEmail,
  customerName,
  amount,
  currency,
  invoiceUrl,
  retryDate,
) => {
  try {
    const emailContent = getPaymentFailedTemplate(
      customerName,
      amount,
      currency,
      invoiceUrl,
      retryDate,
    );

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: "Payment Failed - Action Required",
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending payment failed email:", error);
      throw new Error("Failed to send payment failed email");
    }

    logger.info("Payment failed email sent successfully:", data);
    return { success: true, message: "Payment failed email sent successfully" };
  } catch (error) {
    logger.error("Error sending payment failed email:", error);
    throw new Error("Failed to send payment failed email");
  }
};

export const sendPaymentSuccessEmail = async (
  toEmail,
  customerName,
  amount,
  currency,
  invoiceUrl,
  nextBillingDate,
) => {
  try {
    const emailContent = getPaymentSuccessTemplate(
      customerName,
      amount,
      currency,
      invoiceUrl,
      nextBillingDate,
    );

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: "Payment Received - Thank You!",
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending payment success email:", error);
      throw new Error("Failed to send payment success email");
    }

    logger.info("Payment success email sent successfully:", data);
    return {
      success: true,
      message: "Payment success email sent successfully",
    };
  } catch (error) {
    logger.error("Error sending payment success email:", error);
    throw new Error("Failed to send payment success email");
  }
};

export const sendSubscriptionCancelledEmail = async (
  toEmail,
  customerName,
  planName,
  endDate,
) => {
  try {
    const emailContent = getSubscriptionCancelledTemplate(
      customerName,
      planName,
      endDate,
    );

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: "Subscription Cancelled - We're Sorry to See You Go",
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending subscription cancelled email:", error);
      throw new Error("Failed to send subscription cancelled email");
    }

    logger.info("Subscription cancelled email sent successfully:", data);
    return {
      success: true,
      message: "Subscription cancelled email sent successfully",
    };
  } catch (error) {
    logger.error("Error sending subscription cancelled email:", error);
    throw new Error("Failed to send subscription cancelled email");
  }
};

export const sendInvoiceEmail = async (
  toEmail,
  customerName,
  invoiceNumber,
  items,
  total,
  currency,
  invoiceUrl,
  dueDate,
) => {
  try {
    const emailContent = getInvoiceTemplate(
      customerName,
      invoiceNumber,
      items,
      total,
      currency,
      invoiceUrl,
      dueDate,
    );

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: `Invoice ${invoiceNumber} from PayFlow Analytics`,
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending invoice email:", error);
      throw new Error("Failed to send invoice email");
    }

    logger.info("Invoice email sent successfully:", data);
    return { success: true, message: "Invoice email sent successfully" };
  } catch (error) {
    logger.error("Error sending invoice email:", error);
    throw new Error("Failed to send invoice email");
  }
};

export const sendTrialEndingEmail = async (
  toEmail,
  customerName,
  planName,
  daysLeft,
  upgradeUrl,
) => {
  try {
    const emailContent = getTrialEndingTemplate(
      customerName,
      planName,
      daysLeft,
      upgradeUrl,
    );

    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_EMAIL}`,
      to: toEmail,
      subject: `Your Trial Ends in ${daysLeft} ${daysLeft === 1 ? "Day" : "Days"}`,
      html: emailContent,
    });

    if (error) {
      logger.error("Error sending trial ending email:", error);
      throw new Error("Failed to send trial ending email");
    }

    logger.info("Trial ending email sent successfully:", data);
    return { success: true, message: "Trial ending email sent successfully" };
  } catch (error) {
    logger.error("Error sending trial ending email:", error);
    throw new Error("Failed to send trial ending email");
  }
};
