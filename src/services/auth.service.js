const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { generateOtp } = require('../utils/generateOtp');
const emailService = require('./email.service');
const smsService = require('./sms.service');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Forgot password
 * @param {string} email
 * @param {string} phone
 * @returns {Promise}
 */
const forgotPassword = async (email, phone) => {
  const user = email ? await userService.getUserByEmail(email) : await userService.getUserByPhone(phone);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
  await user.save();

  if (email) {
    await emailService.sendForgotPasswordEmail(email, otp);
  } else {
    const fullPhone = user.dialingCode + user.phone;
    await smsService.sendResetPasswordSms(fullPhone, otp);
  }
};

/**
 * Reset password
 * @param {string} email
 * @param {string} phone
 * @param {string} otp
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (email, phone, otp, newPassword) => {
  const user = email ? await userService.getUserByEmail(email) : await userService.getUserByPhone(phone);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP expired or invalid');
  }

  if (user.otp !== parseInt(otp, 10)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  await userService.updateUserById(user.id, { password: newPassword });

  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();
};

const verifyOtp = async (body) => {
  const { email, phone, otp } = body;

  const user = email ? await userService.getUserByEmail(email) : await userService.getUserByPhone(phone);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.isVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already verified');
  }

  if (!user.otp || !user.otpExpiresAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP not found or already used');
  }

  if (user.otpExpiresAt < Date.now()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP has expired');
  }

  if (user.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpiresAt = null;

  await user.save();
  return user;
};

const saveUserInfo = async (body) => {
  const { email, phone, role, governmentId } = body;
  const user = email ? await userService.getUserByEmail(email) : await userService.getUserByPhone(phone);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  await userService.updateUserById(user.id, { role, governmentId, isAccountVerified: true });
  return user;
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyOtp,
  forgotPassword,
  saveUserInfo,
};
