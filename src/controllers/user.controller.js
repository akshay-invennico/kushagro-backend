const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const pick = require('../utils/pick');

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'User fetched successfully',
    data: user,
    meta: {},
    error: null,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const updatedUser = await userService.updateUserById(userId, req.body);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
    meta: {},
    error: null,
  });
});

const changePassword = catchAsync(async (req, res) => {
  await userService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Password changed successfully',
    data: null,
    meta: {},
    error: null,
  });
});

const deleteAccount = catchAsync(async (req, res) => {
  await userService.deleteAccount(req.user._id, req.body.password);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Account deleted successfully',
    data: null,
    meta: {},
    error: null,
  });
});

const reportUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  await userService.reportUser(req.user._id, userId, {
    ...req.body,
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'User reported successfully',
    data: null,
    meta: {},
    error: null,
  });
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role', 'status', 'from', 'to', 'minSpent', 'maxSpent']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const suspendUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const user = await userService.suspendUserById(userId, reason);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'User suspended successfully',
    data: user,
    meta: {},
    error: null,
  });
});

const reactivateUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await userService.reactivateUserById(userId);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'User reactivated successfully',
    data: user,
    meta: {},
    error: null,
  });
});

const getResetPasswordLink = catchAsync(async (req, res) => {
  const { userId } = req.params;
  await userService.getResetPasswordLink(userId);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Reset password link sent successfully',
    data: null,
    meta: {},
    error: null,
  });
});

module.exports = {
  getUser,
  getUsers,
  updateUser,
  changePassword,
  deleteAccount,
  reportUser,
  suspendUser,
  reactivateUser,
  getResetPasswordLink,
};
