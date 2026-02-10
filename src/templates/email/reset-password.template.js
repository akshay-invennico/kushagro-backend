const getBaseTemplate = require('./base.template');

const getResetPasswordEmailTemplate = (resetUrl) => {
  const content = `
    <h2>Reset Your Password</h2>
    <p>Dear User,</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn" style="color: #ffffff;">Reset Password</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    
    <p>If you did not request any password resets, please ignore this email.</p>
    
    <div class="divider"></div>
    <p>Best regards,<br>Team Kushagro</p>
  `;
  return getBaseTemplate(content);
};

module.exports = getResetPasswordEmailTemplate;
