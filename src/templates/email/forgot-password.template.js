const getBaseTemplate = require('./base.template');

const getForgotPasswordEmailTemplate = (otp) => {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Dear User,</p>
    <p>We received a request to reset your password. Use the OTP below to proceed:</p>
    
    <div class="otp-code">${otp}</div>
    
    <p>This OTP is valid for <strong>15 minutes</strong>.</p>
    <p>If you did not request this change, please ignore this email.</p>
    
    <div class="divider"></div>
    <p>Best regards,<br>Team Kushagro</p>
  `;
  return getBaseTemplate(content);
};

module.exports = getForgotPasswordEmailTemplate;
