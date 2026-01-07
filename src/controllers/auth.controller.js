const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService, smsService } = require('../services');
const { generateOtp } = require('../utils/generateOtp');
const ApiError = require('../utils/ApiError');

const register = catchAsync(async (req, res) => {
  const { email, phone } = req.body;

  let user = await userService.getUserByEmailOrPhone(email, phone);

  if (user && user.isVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists. Please login.');
  }

  if (user && !user.isVerified) {
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    if (user.phone) {
      const phoneNumber = user.dialingCode + user.phone;
      await smsService.sendOtpSms(phoneNumber, otp);
    } else {
      await emailService.sendVerificationEmail(user.email, otp);
    }

    return res.status(httpStatus.OK).send({
      success: true,
      message: 'Verification OTP resent successfully',
      data: { user },
      meta: null,
      error: null,
    });
  }

  user = await userService.createUser(req.body);

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
  await user.save();

  if (user.phone) {
    const phoneNumber = user.dialingCode + user.phone;
    await smsService.sendOtpSms(phoneNumber, otp);
  } else {
    await emailService.sendVerificationEmail(user.email, otp);
  }

  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'OTP sent successfully',
    data: { user },
    meta: null,
    error: null,
  });
});

const verifyOtp = catchAsync(async (req, res) => {
  const user = await authService.verifyOtp(req.body);
  const tokens = await tokenService.generateTemporaryAuthTokens(user);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'OTP verified successfully. Please complete your registration.',
    data: { user, tokens },
    meta: null,
    error: null,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, phone, password } = req.body;

  if (email) {
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user);
    res.send({
      success: true,
      message: 'Login successful',
      data: { user, tokens },
      meta: null,
      error: null,
    });
  } else if (phone) {
    const user = await authService.loginUserWithPhoneAndPassword(phone, password);
    const tokens = await tokenService.generateAuthTokens(user);
    res.send({
      success: true,
      message: 'Login successful',
      data: { user, tokens },
      meta: null,
      error: null,
    });
  }
});

const loginAdmin = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginAdminWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({
    success: true,
    message: 'Admin login successful',
    data: { user, tokens },
    meta: null,
    error: null,
  });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Logout successful',
    data: null,
    meta: null,
    error: null,
  });
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({
    success: true,
    message: 'Tokens refreshed successfully',
    data: { ...tokens },
    meta: null,
    error: null,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email, phone } = req.body;
  await authService.forgotPassword(email, phone);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'OTP sent successfully',
    data: null,
    meta: null,
    error: null,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, phone, otp, password } = req.body;
  await authService.resetPassword(email, phone, otp, password);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Password reset successfully',
    data: null,
    meta: null,
    error: null,
  });
});

const completeRegistration = catchAsync(async (req, res) => {
  const user = await authService.completeRegistration(req.user._id, req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Registration completed successfully',
    data: { user, tokens },
    meta: null,
    error: null,
  });
});

const verifyForgotOtp = catchAsync(async (req, res) => {
  await authService.verifyForgotOtp(req.body);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'OTP verified successfully',
    data: null,
    meta: null,
    error: null,
  });
});

module.exports = {
  register,
  login,
  loginAdmin,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyOtp,
  completeRegistration,
  verifyForgotOtp,
};
