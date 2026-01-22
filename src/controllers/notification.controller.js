const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { notificationService } = require('../services');

const getNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['isRead']);
  filter.recipient = req.user.id;
  filter.status = 'ACTIVE';

  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await notificationService.queryNotifications(filter, options);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Notifications fetched successfully',
    data: result.results,
    meta: {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    },
    error: null,
  });
});

const markRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.notificationId);

  if (notification.recipient.toString() !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You cannot access this notification');
  }

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Notification marked as read',
    data: notification,
    meta: null,
    error: null,
  });
});

const markAllRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'All notifications marked as read',
    data: null,
    meta: null,
    error: null,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  // Check if notification belongs to user
  if (notification.recipient.toString() !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You cannot delete this notification');
  }

  await notificationService.deleteNotification(req.params.notificationId);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Notification deleted successfully',
    data: null,
    meta: null,
    error: null,
  });
});

const sendNotification = catchAsync(async (req, res) => {
  const { title, body, userType, notificationType } = req.body;
  const result = await notificationService.sendPushNotificationByRole({
    title,
    body,
    userType,
    notificationType,
  });

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Notification processed successfully',
    data: {
      sent: result.success,
      failed: result.failed,
    },
    meta: null,
    error: null,
  });
});

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  sendNotification,
};
