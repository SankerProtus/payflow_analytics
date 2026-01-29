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

export const passwordResetEmailTemplate = (token) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${token}">Reset Password</a>
      <p>This link will expire in 20 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <h4>Best regards, <br>PayFlow Team</h4>
  </div>
`;
