export const verificationEmailTemplate = (link) => `
  <div style="font-family: Arial, sans-serif">
    <h2>Welcome to PayFlow Analytics</h2>
    <p>Please verify your email by clicking the link below:</p>
    <h3>Verification Link: <br></h3>
    <a href="${link}">Verify Email</a>
    <p>This link expires in 20 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
    <h4>Best regards, <br>PayFlow Team</h4>
  </div>
`;

export const passwordResetEmailTemplate = (resetLink) => `
  <div style="font-family: Arial, sans-serif">
    <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>This link will expire in 20 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
  </div>
`;
