const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { generateOtp } = require('../utils/generateOtp');
const emailService = require('./email.service');
const smsService = require('./sms.service');
const notificationService = require('./notification.service');
const admin = require('../config/firebase');
const User = require('../models/user.model')
/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect email or password');
  }

  if (!user.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Your account is not active');
  }

  if (user.isVerified && user.isAccountVerified) {
    return user;
  }
  throw new ApiError(httpStatus.BAD_REQUEST, 'Please verify your account first');
};

const loginUserWithPhoneAndPassword = async (phone, password) => {
  const user = await userService.getUserByPhone(phone);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect phone or password');
  }

  if (!user.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Your account is not active');
  }

  if (user.isVerified && user.isAccountVerified) {
    return user;
  }
  throw new ApiError(httpStatus.BAD_REQUEST, 'Please verify your account first');
};

/**
 * Login admin with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginAdminWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect email or password');
  }
  if (user.role !== 'ADMIN') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You are not authorized to login as admin');
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

  if (Number(user.otp) !== Number(otp)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpiresAt = null;

  await user.save();
  return user;
};

const completeRegistration = async (userId, body) => {
  const { role, governmentId } = body;

  const user = await userService.getUserById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.isVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please verify your account first');
  }

  if (user.isAccountVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Registration already completed');
  }

  if (!role) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role is required');
  }

  if (role !== 'BUYER' && !governmentId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Government ID is required');
  }

  const updatePayload = {
    role,
    isAccountVerified: true,
  };

  if (role !== 'BUYER') {
    updatePayload.governmentId = governmentId;
  }

  const updatedUser = await userService.updateUserById(user.id, updatePayload);

  // notification for admin
  const admins = await userService.queryUsers({ role: 'ADMIN' }, { limit: 100 });
  for (const admin of admins.results) {
    await notificationService.createNotification({
      recipient: admin.id,
      title: 'New User Registered',
      message: `New user registered! ${updatedUser.name} has joined as a ${updatedUser.role}.`,
      type: 'USER_REGISTERED',
      data: { userId: updatedUser.id, role: 'ADMIN' },
    });
  }

  return updatedUser;
};

const verifyForgotOtp = async (body) => {
  const { email, phone, otp } = body;
  const user = email ? await userService.getUserByEmail(email) : await userService.getUserByPhone(phone);

  if (!user.isVerified || !user.isAccountVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not verified or account is not verified');
  }

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.otp || !user.otpExpiresAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP not found or already used');
  }

  if (user.otpExpiresAt < Date.now()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP has expired');
  }

  if (Number(user.otp) !== Number(otp)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  return user;
};



/**
 * Firebase SSO Login (Google / Apple)
 */
const firebaseSSOLogin = async ({ idToken }) => {
  // 1️⃣ Verify Firebase token
  const decodedToken = await admin.auth().verifyIdToken(idToken);

  const {
    email,
    name,
    picture,
    uid,
    firebase: firebaseInfo,
  } = decodedToken;

  const provider = firebaseInfo?.sign_in_provider;

  if (!email) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Email not found in Firebase token'
    );
  }


  let user = await User.findOne({ email });
  let token;
  let isNewUser = false;

  if (user) {
    if (!user.isActive) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Your account is not active'
      );
    }

    user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          isVerified: true,
          primaryKey: 'email',
          ...(picture && !user.profile && { profile: picture }),
          ...(name && !user.name && { name }),
        },
      },
      { new: true }
    );

    token = await tokenService.generateAuthTokens(user);
  } 
  // 4️⃣ New User → REGISTER
  else {
    isNewUser = true;

    user = await User.create({
      name: name || 'User',
      email,
      profile: picture || null,
      password: uid, // internal mapping only
      isVerified: true,
      isAccountVerified: false,
      primaryKey: 'email',
      isActive: true,
    });

    // 🕒 Temporary token
    token = await tokenService.generateTemporaryAuthTokens(user);
  }

  console.log("the token is",token);

  return {
    user,
    token,
    provider,
    isNewUser,
  };
};







module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyOtp,
  forgotPassword,
  completeRegistration,
  loginUserWithPhoneAndPassword,
  loginAdminWithEmailAndPassword,
  verifyForgotOtp,
  firebaseSSOLogin,

};
