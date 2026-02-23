const sgMail = require('@sendgrid/mail');
const config = require('../config/config');
const logger = require('../config/logger');
const getVerificationEmailTemplate = require('../templates/email/verification.template');
const getResetPasswordEmailTemplate = require('../templates/email/reset-password.template');
const getForgotPasswordEmailTemplate = require('../templates/email/forgot-password.template');
const getOrderPlacedEmailTemplate = require('../templates/email/order-placed.template');
const getOrderDeliveredEmailTemplate = require('../templates/email/order-delivered.template');
const getSellerVerificationEmailTemplate = require('../templates/email/seller-verification.template');

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
 * @param {string} html
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text, html) => {
  const msg = {
    to,
    from: config.email.sendgrid.senderMail,
    subject,
    text,
    html,
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
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset/password?token=${token}`;
  const text = `Dear user, To reset your password, click on this link: ${resetPasswordUrl}`;
  const html = getResetPasswordEmailTemplate(resetPasswordUrl);
  await sendEmail(to, subject, text, html);
};

/**
 * @param {string} to
 * @param {string} otp
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, otp) => {
  const subject = 'Your verification code';
  const text = `Your One-Time Password (OTP) for verification is: ${otp}`;
  const html = getVerificationEmailTemplate(otp);
  await sendEmail(to, subject, text, html);
};

/**
 * @param {string} to
 * @param {string} otp
 * @returns {Promise}
 */
const sendForgotPasswordEmail = async (to, otp) => {
  const subject = 'Reset Password OTP';
  const text = `Your OTP for password reset is: ${otp}`;
  const html = getForgotPasswordEmailTemplate(otp);
  await sendEmail(to, subject, text, html);
};

/**
 * @param {string} to
 * @param {string} customerName
 * @param {string} orderId
 * @param {Array} items
 * @param {number} totalAmount
 * @returns {Promise}
 */
const sendOrderPlacedEmail = async (to, customerName, orderId, items, totalAmount) => {
  const subject = 'Order Confirmation';
  const text = `Thank you for your order #${orderId}. Total: ${totalAmount}`;
  const html = getOrderPlacedEmailTemplate(orderId, customerName, items, totalAmount);
  await sendEmail(to, subject, text, html);
};

/**
 * @param {string} to
 * @param {string} sellerName
 * @param {string} status
 * @param {string} reason
 * @returns {Promise}
 */
const sendSellerVerificationEmail = async (to, sellerName, status, reason) => {
  const subject = 'Seller Verification Update';
  const text = `Your seller verification status has been updated to: ${status}`;
  const html = getSellerVerificationEmailTemplate(sellerName, status, reason);
  await sendEmail(to, subject, text, html);
};

/**
 * @param {string} to
 * @param {string} customerName
 * @param {string} orderId
 * @param {Array} items
 * @param {number} totalAmount
 * @returns {Promise}
 */
const sendOrderDeliveredEmail = async (to, customerName, orderId, items, totalAmount) => {
  const subject = 'Order Delivered Successfully';
  const text = `Your order #${orderId} has been delivered successfully. Total: ${totalAmount}`;
  const html = getOrderDeliveredEmailTemplate(orderId, customerName, items, totalAmount);
  await sendEmail(to, subject, text, html);
};

module.exports = {
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendForgotPasswordEmail,
  sendOrderPlacedEmail,
  sendSellerVerificationEmail,
  sendOrderDeliveredEmail,
};
