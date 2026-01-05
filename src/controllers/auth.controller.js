const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService, smsService } = require('../services');
const { generateOtp } = require('../utils/generateOtp');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
  await user.save();

  if (req.body.phone) {
    const phone = user.dialingCode + user.phone;
    await smsService.sendOtpSms(phone, otp);
  } else {
    await emailService.sendVerificationEmail(user.email, otp);
  }
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyOtp = catchAsync(async (req, res) => {
  const user = await authService.verifyOtp(req.body);

  res.status(httpStatus.OK).send({
    message: 'OTP verified successfully',
    user,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email, phone } = req.body;
  await authService.forgotPassword(email, phone);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, phone, otp, password } = req.body;
  await authService.resetPassword(email, phone, otp, password);
  res.status(httpStatus.NO_CONTENT).send();
});

const saveUserInfo = catchAsync(async (req, res) => {
  const user = await authService.saveUserInfo(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.OK).send({ message: 'User info saved successfully', user, tokens });
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyOtp,
  saveUserInfo,
};
