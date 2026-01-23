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

const getMyTransactions = async (req, res) => {
  const userId = req.user._id;

  const data = await userService.getMyTransactions(userId, req.query);

  res.status(200).json({
    success: true,
    data,
  });
};
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

const getSellers = async (req, res) => {
  const result = await userService.getSellersList(req.query);

  res.status(httpStatus.OK).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
};
const getSellerDetails = async (req, res) => {
  const { sellerId } = req.params;

  const result = await userService.getSellerDetails(sellerId);

  res.status(httpStatus.OK).json({
    success: true,
    data: result,
  });
};

const saveFcmToken = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { fcmToken } = req.body;

  const result = await userService.saveFcmToken({
    userId,
    fcmToken,
  });

  return res.status(httpStatus.OK).json({
    success: true,
    data: result,
  });
});

/**
 * Controller to add a new address
 */
const addBuyerAddress = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const addressData = req.body;

  const updatedAddresses = await userService.addAddress(userId, addressData);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Address added successfully',
    data: updatedAddresses,
  });
});

const getBuyerAddresses = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const addresses = await userService.getAddresses(userId);

  res.status(httpStatus.OK).json({
    success: true,
    data: addresses,
  });
});

const sendOtpToBuyerBeforeOrder = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const result = await userService.sendOtpToBuyerBeforeOrder(userId);

  res.status(httpStatus.OK).json({
    success: true,
    message: result.message,
  });
});

const verifyOtpBeforeOrder = catchAsync(async (req, res) => {
  const { userId, otp } = req.body;

  const result = await userService.verifyOtpBeforeOrder({
    userId,
    otp,
  });

  res.status(httpStatus.OK).json(result);
});


const blockBuyer = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const sellerId = req.user._id;

  const result = await userService.blockUserById(sellerId, userId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Buyer blocked successfully',
    data: result,
  });
});

const unblockBuyer = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const sellerId = req.user._id;

  const result = await userService.unblockUserById(sellerId, userId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Buyer unblocked successfully',
    data: result,
  });
});


const getBlockedUsers = catchAsync(async (req, res) => {
  const sellerId = req.user._id;

  const result = await userService.getBlockedUsers(sellerId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Blocked users fetched successfully',
    data: result,
  });
});

module.exports = {
  getUser,
  getUsers,
  updateUser,
  changePassword,
  deleteAccount,
  getMyTransactions,
  suspendUser,
  reactivateUser,
  getResetPasswordLink,
  getSellers,
  getSellerDetails,
  saveFcmToken,
  addBuyerAddress,
  getBuyerAddresses,
  sendOtpToBuyerBeforeOrder,
  verifyOtpBeforeOrder,
  blockBuyer,
  unblockBuyer,
  getBlockedUsers,
};
