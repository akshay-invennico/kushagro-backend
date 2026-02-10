const getBaseTemplate = require('./base.template');

const getVerificationEmailTemplate = (otp) => {
  const content = `
    <h2>Verify Your Account</h2>
    <p>Dear User,</p>
    <p>Thank you for registering with Kushagro. To complete your verification, please use the One-Time Password (OTP) below:</p>
    
    <div class="otp-code">${otp}</div>
    
    <p>This OTP is valid for <strong>15 minutes</strong>.</p>
    <p>Please do not share this code with anyone. If you did not request this verification, you can safely ignore this email.</p>
    
    <div class="divider"></div>
    <p>Best regards,<br>Team Kushagro</p>
  `;
  return getBaseTemplate(content);
};

module.exports = getVerificationEmailTemplate;
