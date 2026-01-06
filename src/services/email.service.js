const sgMail = require('@sendgrid/mail');
const config = require('../config/config');
const logger = require('../config/logger');

// Initialize SendGrid with API key
sgMail.setApiKey(config.email.sendgrid.apiKey);

/* istanbul ignore next */
if (config.env !== 'test') {
  logger.info('Connected to Email Server');
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = {
    to,
    from: config.email.sendgrid.senderMail,
    subject,
    text,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Email sent successfully to ${to}`);
  } catch (error) {
    logger.error(`Error sending email to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset/password?token=${token}`;
  const text = `Dear user,
  To reset your password, click on this link: ${resetPasswordUrl}
  If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

const sendVerificationEmail = async (to, otp) => {
  const subject = 'Your verification code';
  const text = `Dear User,
  Your One-Time Password (OTP) for verification is:
  ${otp}
  This OTP is valid for 15 minutes.
  Please do not share this code with anyone.
  If you did not request this verification, you can safely ignore this email.
  Thanks,
  Team Kushagro`;

  await sendEmail(to, subject, text);
};

const sendForgotPasswordEmail = async (to, otp) => {
  const subject = 'Reset Password OTP';
  const text = `Dear User,
  Your OTP for password reset is: ${otp}
  This OTP is valid for 15 minutes.
  If you did not request this, please ignore this email.`;
  await sendEmail(to, subject, text);
};

module.exports = {
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendForgotPasswordEmail,
};
