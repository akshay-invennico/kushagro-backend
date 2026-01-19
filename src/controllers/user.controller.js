const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

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

const getMyTransactions = async (req, res) => {
  const userId = req.user._id;

  const data = await transactionService.getMyTransactions(
    userId,
    req.query
  );

  res.status(200).json({
    success: true,
    data,
  });
};

module.exports = {
  getUser,
  updateUser,
  changePassword,
  deleteAccount,
  reportUser,
  getMyTransactions
};
