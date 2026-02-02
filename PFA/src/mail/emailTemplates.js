// SEND EMAIL VERIFICATION HTML TEMPLATE
export const verificationEmailTemplate = (token) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #2563eb;">Welcome to PayFlow Analytics!</h2>
    <p style="font-size: 14px; color: #6b7280;" >Thank you for registering with us. To complete your registration, please verify your email address.</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Your verification code is:</p>
      <div style="background-color: #ffffff; border: 2px solid #2563eb; border-radius: 8px; padding: 15px; display: inline-block;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; font-family: monospace;">${token}</span>
      </div>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">This code will expire in 20 minutes</p>
    </div>

    <p style="font-size: 14px; color: #6b7280;">Enter this code on the verification page to activate your account.</p>
    <p style="font-size: 14px; color: #6b7280;">If you did not create an account, please ignore this email.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

// RESET PASSWORD EMAIL TEMPLATE
export const passwordResetEmailTemplate = (token) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${token}">Reset Password</a>
      <p>This link will expire in 20 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <h4>Best regards, <br>PayFlow Team</h4>
  </div>
`;

// PAYMENT EMAIL TEMPLATES+
/**
 * Subscription created email
 */
export const subscriptionCreatedEmail = ({ customerName, planName, amount, currency, billingPeriod, trialEnd }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #10b981;">Welcome to PayFlow!</h2>
    <p>Hi ${customerName},</p>
    <p>Thank you for subscribing to PayFlow. Your subscription is now active!</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Subscription Details</h3>
      <p style="margin: 8px 0;"><strong>Plan:</strong> ${planName}</p>
      <p style="margin: 8px 0;"><strong>Amount:</strong> ${amount} ${currency} / ${billingPeriod}</p>
      ${trialEnd ? `<p style="margin: 8px 0;"><strong>Trial Ends:</strong> ${trialEnd.toLocaleDateString()}</p>` : ''}
    </div>

    <p>You can manage your subscription anytime from your account dashboard.</p>
    <p style="margin-top: 30px;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

/**
 * Subscription canceled email
 */
export const subscriptionCanceledEmail = ({ customerName, endDate }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #ef4444;">Subscription Canceled</h2>
    <p>Hi ${customerName},</p>
    <p>We're sorry to see you go. Your subscription has been canceled and will end on ${endDate.toLocaleDateString()}.</p>

    <p>Until then, you'll continue to have access to all premium features.</p>

    <p>If you change your mind, you can reactivate your subscription anytime from your account.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

/**
 * Trial ending soon email
 */
export const trialEndingSoonEmail = ({ customerName, trialEndDate, planName, amount, currency }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #f59e0b;">Your Trial is Ending Soon</h2>
    <p>Hi ${customerName},</p>
    <p>Your free trial of PayFlow ${planName} will end on <strong>${trialEndDate.toLocaleDateString()}</strong>.</p>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>After your trial ends:</strong></p>
      <p style="margin: 8px 0 0 0;">You'll be charged ${amount} ${currency} automatically unless you cancel before ${trialEndDate.toLocaleDateString()}.</p>
    </div>

    <p>We hope you're enjoying PayFlow! If you have any questions, feel free to reach out to our support team.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

/**
 * Invoice paid email (receipt)
 */
export const invoicePaidEmail = ({ customerName, invoiceNumber, amount, currency, paidDate, invoiceUrl, pdfUrl }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #10b981;">Payment Received</h2>
    <p>Hi ${customerName},</p>
    <p>Thank you for your payment! This email confirms that we've received your payment.</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Payment Details</h3>
      <p style="margin: 8px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
      <p style="margin: 8px 0;"><strong>Amount Paid:</strong> ${amount} ${currency}</p>
      <p style="margin: 8px 0;"><strong>Date:</strong> ${paidDate.toLocaleDateString()}</p>
    </div>

    ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #2563eb;">View Invoice Online</a></p>` : ''}
    ${pdfUrl ? `<p><a href="${pdfUrl}" style="color: #2563eb;">Download PDF Receipt</a></p>` : ''}

    <p style="margin-top: 30px;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

/**
 * Invoice payment failed email
 */
export const invoicePaymentFailedEmail = ({ customerName, amount, currency, failureReason, retryCount, updatePaymentUrl }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #ef4444;">Payment Failed - Action Required</h2>
    <p>Hi ${customerName},</p>
    <p>We were unable to process your payment of <strong>${amount} ${currency}</strong>.</p>

    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Reason:</strong> ${failureReason}</p>
      ${retryCount > 1 ? `<p style="margin: 8px 0 0 0;"><strong>Retry Attempt:</strong> ${retryCount}</p>` : ''}
    </div>

    <p><strong>What happens next:</strong></p>
    <ul>
      <li>We'll automatically retry the payment in 3 days</li>
      <li>Your service will continue during this grace period</li>
      <li>If payment continues to fail, your service may be suspended</li>
    </ul>

    <p><strong>To avoid service interruption:</strong></p>
    <p>Please update your payment method or contact your bank to resolve any issues.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${updatePaymentUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
    </div>

    <p style="margin-top: 30px;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

/**
 * Payment succeeded email
 */
export const paymentSucceededEmail = ({ customerName, amount, currency, description }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #10b981;">Payment Successful</h2>
    <p>Hi ${customerName},</p>
    <p>Your payment has been processed successfully!</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 8px 0;"><strong>Amount:</strong> ${amount} ${currency}</p>
      ${description ? `<p style="margin: 8px 0;"><strong>Description:</strong> ${description}</p>` : ''}
    </div>

    <p style="margin-top: 30px;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

/**
 * Payment failed email
 */
export const paymentFailedEmail = ({ customerName, amount, currency, failureReason }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #ef4444;">Payment Failed</h2>
    <p>Hi ${customerName},</p>
    <p>We were unable to process your payment of ${amount} ${currency}.</p>

    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Reason:</strong> ${failureReason}</p>
    </div>

    <p>Please check your payment method and try again.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>PayFlow Team</strong></p>
  </div>
`;

