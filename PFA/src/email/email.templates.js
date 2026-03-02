/**
 * Modern SaaS Email Templates for PayFlow Analytics
 * Responsive, professional email templates optimized for all email clients
 */

// Base email wrapper with consistent styling
const getEmailWrapper = (content, preheaderText = "") => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <!--[if mso]>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    body,
    table,
    td {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    body {
      margin: 0;
      padding: 0;
      width: 100%;
      word-break: break-word;
      -webkit-font-smoothing: antialiased;
      background-color: #f6f9fc;
    }

    table {
      border-collapse: collapse;
      border-spacing: 0;
    }

    a {
      color: #6366f1;
      text-decoration: none;
    }

    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.3s ease;
    }

    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }

    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 0 20px !important;
      }

      .content {
        padding: 30px 20px !important;
      }

      h1 {
        font-size: 24px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f6f9fc;">
  <!-- Preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; visibility: hidden; mso-hide: all;">
    ${preheaderText}
  </div>

  <!-- Email container -->
  <table role="presentation" style="width: 100%; background-color: #f6f9fc;" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <!-- Main content wrapper -->
        <table role="presentation" class="container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                PayFlow Analytics
              </h2>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px;">
                PayFlow Analytics - Payment Intelligence Platform
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} PayFlow Analytics. All rights reserved.
              </p>
              <div style="margin-top: 20px;">
                <a href="#" style="color: #64748b; font-size: 12px; margin: 0 10px; text-decoration: none;">Privacy Policy</a>
                <span style="color: #cbd5e1;">•</span>
                <a href="#" style="color: #64748b; font-size: 12px; margin: 0 10px; text-decoration: none;">Terms of Service</a>
                <span style="color: #cbd5e1;">•</span>
                <a href="#" style="color: #64748b; font-size: 12px; margin: 0 10px; text-decoration: none;">Support</a>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer note -->
        <table role="presentation" style="max-width: 600px; width: 100%; margin-top: 20px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 0 20px;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 18px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Email Verification Template
 */
export const getVerifiedEmailTemplate = (
  verificationCode,
  username = "there",
) => {
  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Verify Your Email
    </h1>

    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${username}! 👋
    </p>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
      Thank you for signing up with PayFlow Analytics. To complete your registration and unlock all features, please verify your email address using the code below:
    </p>

    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); border: 2px dashed #6366f1; border-radius: 12px; padding: 24px; margin: 0 0 32px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
        Your Verification Code
      </p>
      <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #6366f1; letter-spacing: 8px; margin: 8px 0;">
        ${verificationCode}
      </div>
      <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 13px;">
        This code expires in 15 minutes
      </p>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 0 0 24px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
        <strong>Security Tip:</strong> Never share this code with anyone. PayFlow Analytics will never ask for your verification code.
      </p>
    </div>
  `;

  return getEmailWrapper(content, "Verify your PayFlow Analytics account");
};

/**
 * Welcome Email Template
 */
export const getWelcomeEmailTemplate = (email, username = "there") => {
  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Welcome to PayFlow Analytics! 🎉
    </h1>

    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${username}, we're thrilled to have you on board!
    </p>

    <p style="margin: 0 0 32px 0; color: #64748b; font-size: 16px; line-height: 1.7;">
      Your account has been successfully created and verified. You now have access to powerful payment analytics and subscription management tools designed to help you grow your business.
    </p>

    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 12px; padding: 28px; margin: 0 0 32px 0;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
        🚀 Get Started with PayFlow
      </h2>

      <div style="margin-bottom: 16px;">
        <div style="display: table; width: 100%; margin-bottom: 12px;">
          <div style="display: table-cell; width: 32px; vertical-align: top;">
            <span style="display: inline-block; width: 24px; height: 24px; background-color: #10b981; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-weight: 600; font-size: 12px;">1</span>
          </div>
          <div style="display: table-cell; vertical-align: top;">
            <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 500;">
              Connect Your Payment Gateway
            </p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
              Link your Stripe account to start tracking payments
            </p>
          </div>
        </div>

        <div style="display: table; width: 100%; margin-bottom: 12px;">
          <div style="display: table-cell; width: 32px; vertical-align: top;">
            <span style="display: inline-block; width: 24px; height: 24px; background-color: #10b981; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-weight: 600; font-size: 12px;">2</span>
          </div>
          <div style="display: table-cell; vertical-align: top;">
            <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 500;">
              Set Up Your Dashboard
            </p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
              Customize your analytics view and KPIs
            </p>
          </div>
        </div>

        <div style="display: table; width: 100%;">
          <div style="display: table-cell; width: 32px; vertical-align: top;">
            <span style="display: inline-block; width: 24px; height: 24px; background-color: #10b981; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-weight: 600; font-size: 12px;">3</span>
          </div>
          <div style="display: table-cell; vertical-align: top;">
            <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 500;">
              Invite Your Team
            </p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
              Collaborate with team members on payment insights
            </p>
          </div>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Go to Dashboard →
      </a>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px;">
      <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
        💡 Need Help Getting Started?
      </p>
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
        Check out our <a href="#" style="color: #3b82f6; text-decoration: underline;">documentation</a> or reach out to our support team at support@payflowanalytics.com
      </p>
    </div>
  `;

  return getEmailWrapper(
    content,
    "Welcome to PayFlow Analytics! Your account is ready.",
  );
};

/**
 * Password Reset Template
 */
export const getPasswordResetTemplate = (resetToken, username = "there") => {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Reset Your Password
    </h1>

    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${username}! 👋
    </p>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      We received a request to reset your password for your PayFlow Analytics account. Click the button below to create a new password:
    </p>

    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${resetUrl}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reset Password →
      </a>
    </div>

    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 500;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0; color: #6366f1; font-size: 13px; word-break: break-all; font-family: 'Courier New', monospace;">
        ${resetUrl}
      </p>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
        ⚠️ Security Notice
      </p>
      <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
        This password reset link will expire in 1 hour for security reasons. If you didn't request this reset, please ignore this email and contact our support team immediately.
      </p>
    </div>
  `;

  return getEmailWrapper(content, "Reset your PayFlow Analytics password");
};

/**
 * Payment Failed Template (Dunning)
 */
export const getPaymentFailedTemplate = (
  customerName,
  amount,
  currency,
  invoiceUrl,
  retryDate,
) => {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Payment Failed
    </h1>

    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${customerName},
    </p>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      We were unable to process your recent payment of <strong>${formattedAmount}</strong>. This could be due to insufficient funds, an expired card, or other payment method issues.
    </p>

    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444; border-radius: 12px; padding: 24px; margin: 0 0 32px 0;">
      <table role="presentation" style="width: 100%;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Amount Due:</p>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right;">
            <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">${formattedAmount}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Next Retry:</p>
          </td>
          <td style="padding: 8px 0; text-align: right;">
            <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500;">${retryDate || "In 3 days"}</p>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      To avoid any interruption to your service, please update your payment method or retry the payment:
    </p>

    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${invoiceUrl || "#"}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Update Payment Method →
      </a>
    </div>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
        <strong>Note:</strong> We'll automatically retry this payment in a few days. If the payment continues to fail, your subscription may be suspended.
      </p>
    </div>
  `;

  return getEmailWrapper(
    content,
    `Payment failed for ${formattedAmount} - Action required`,
  );
};

/**
 * Payment Succeeded Template
 */
export const getPaymentSuccessTemplate = (
  customerName,
  amount,
  currency,
  invoiceUrl,
  nextBillingDate,
) => {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Payment Received ✓
    </h1>

    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${customerName},
    </p>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
      Thank you for your payment! Your transaction has been successfully processed.
    </p>

    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 0 0 32px 0;">
      <table role="presentation" style="width: 100%;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Amount Paid:</p>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #bbf7d0; text-align: right;">
            <p style="margin: 0; color: #1e293b; font-size: 20px; font-weight: 700;">${formattedAmount}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Payment Date:</p>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #bbf7d0; text-align: right;">
            <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Next Billing Date:</p>
          </td>
          <td style="padding: 8px 0; text-align: right;">
            <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500;">${nextBillingDate || "N/A"}</p>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${invoiceUrl || "#"}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Invoice →
      </a>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
        Keep this email for your records. If you have any questions about this payment, please contact our support team.
      </p>
    </div>
  `;

  return getEmailWrapper(content, `Payment received - ${formattedAmount}`);
};

/**
 * Subscription Cancelled Template
 */
export const getSubscriptionCancelledTemplate = (
  customerName,
  planName,
  endDate,
) => {
  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17 13H7V11H17V13Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Subscription Cancelled
    </h1>

    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${customerName},
    </p>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      We're sorry to see you go! Your <strong>${planName}</strong> subscription has been cancelled as requested.
    </p>

    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #cbd5e1; border-radius: 12px; padding: 24px; margin: 0 0 32px 0;">
      <p style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px; font-weight: 600; text-align: center;">
        Your subscription will remain active until:
      </p>
      <p style="margin: 0; color: #6366f1; font-size: 24px; font-weight: 700; text-align: center;">
        ${endDate}
      </p>
      <p style="margin: 12px 0 0 0; color: #64748b; font-size: 14px; text-align: center;">
        You'll continue to have full access until this date
      </p>
    </div>

    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      We'd love to hear your feedback! If there's anything we could have done better, please let us know. Your input helps us improve PayFlow Analytics for everyone.
    </p>

    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/billing" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reactivate Subscription →
      </a>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
        Changed your mind? You can reactivate your subscription anytime before ${endDate} without losing your data.
      </p>
    </div>
  `;

  return getEmailWrapper(content, "Your subscription has been cancelled");
};

/**
 * Invoice Template
 */
export const getInvoiceTemplate = (
  customerName,
  invoiceNumber,
  items,
  total,
  currency,
  invoiceUrl,
  dueDate,
) => {
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(total / 100);

  const itemsHtml = items
    .map((item) => {
      const itemAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(item.amount / 100);

      return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500;">${item.description}</p>
          ${item.period ? `<p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">${item.period}</p>` : ""}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
          <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${itemAmount}</p>
        </td>
      </tr>
    `;
    })
    .join("");

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 15.01L9.41 16.42L11 14.84V19H13V14.84L14.59 16.43L16 15.02L12.01 11L8 15.01Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 8px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Invoice
    </h1>

    <p style="margin: 0 0 32px 0; color: #64748b; font-size: 16px; text-align: center;">
      Invoice #${invoiceNumber}
    </p>

    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Hi ${customerName},
    </p>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Thank you for your business! Here's your invoice for the current billing period.
    </p>

    <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 0 0 32px 0;">
      <table role="presentation" style="width: 100%;" cellpadding="0" cellspacing="0">
        ${itemsHtml}
        <tr>
          <td style="padding: 16px 0 0 0;">
            <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 700;">Total:</p>
          </td>
          <td style="padding: 16px 0 0 0; text-align: right;">
            <p style="margin: 0; color: #6366f1; font-size: 24px; font-weight: 700;">${formattedTotal}</p>
          </td>
        </tr>
      </table>
    </div>

    ${
      dueDate
        ? `
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 0 0 24px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
        <strong>Due Date:</strong> ${dueDate}
      </p>
    </div>
    `
        : ""
    }

    <div style="text-align: center; margin: 0 0 24px 0;">
      <a href="${invoiceUrl || "#"}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Full Invoice →
      </a>
    </div>
  `;

  return getEmailWrapper(
    content,
    `Invoice ${invoiceNumber} - ${formattedTotal}`,
  );
};

/**
 * Trial Ending Soon Template
 */
export const getTrialEndingTemplate = (
  customerName,
  planName,
  daysLeft,
  upgradeUrl,
) => {
  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 16px; border-radius: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="white"/>
        </svg>
      </div>
    </div>

    <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 32px; font-weight: 700; text-align: center; line-height: 1.2;">
      Your Trial is Ending Soon
    </h1>

    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${customerName},
    </p>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Your free trial of PayFlow Analytics <strong>${planName}</strong> plan will end in <strong>${daysLeft} ${daysLeft === 1 ? "day" : "days"}</strong>. We hope you've enjoyed exploring our platform!
    </p>

    <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 0 0 32px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
        Trial Ends In
      </p>
      <p style="margin: 0; color: #f59e0b; font-size: 48px; font-weight: 700; line-height: 1;">
        ${daysLeft}
      </p>
      <p style="margin: 4px 0 0 0; color: #92400e; font-size: 16px; font-weight: 500;">
        ${daysLeft === 1 ? "Day" : "Days"}
      </p>
    </div>

    <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      To continue enjoying uninterrupted access to all features, upgrade to a paid plan today. Don't lose your analytics, reports, and customer data!
    </p>

    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${upgradeUrl || "#"}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Upgrade Now →
      </a>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px;">
      <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
        💎 What You'll Keep:
      </p>
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
        • All your payment analytics and insights<br>
        • Customer data and subscription history<br>
        • Unlimited API access<br>
        • Priority customer support
      </p>
    </div>
  `;

  return getEmailWrapper(
    content,
    `Your trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,
  );
};
