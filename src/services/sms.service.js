const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOtpSms = async (phone, otp) => {
  return client.messages.create({
    body: `Your verification code is ${otp}. Valid for 15 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

const sendResetPasswordSms = async (phone, otp) => {
  return client.messages.create({
    body: `Your reset password code is ${otp}. Valid for 15 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

const sendResetPasswordLink = async (phone, link) => {
  return client.messages.create({
    body: `Your reset password link is ${link}. Valid for 15 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

module.exports = { sendOtpSms, sendResetPasswordSms, sendResetPasswordLink };
