const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Notification = require('../models/notification.model');

/**
 * create notification
 * @param {Object} notificationBody
 * @returns {Promise<Notification>}
 */
const createNotification = async (notificationBody) => {
  return Notification.create(notificationBody);
};

/**
 * get all notifications
 * @param {Object} filter
 * @param {Object} options
 * @param {string} [options.sortBy]
 * @param {number} [options.limit]
 * @param {number} [options.page]
 * @returns {Promise<QueryResult>}
 */
const queryNotifications = async (filter, options) => {
  const notifications = await Notification.paginate(filter, options);
  return notifications;
};

/**
 * get notification by id
 * @param {ObjectId} id
 * @returns {Promise<Notification>}
 */
const getNotificationById = async (id) => {
  return Notification.findById(id);
};

/**
 * mark notification as read
 * @param {ObjectId} notificationId
 * @returns {Promise<Notification>}
 */
const markAsRead = async (notificationId) => {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  notification.isRead = true;
  await notification.save();
  return notification;
};

/**
 * mark all notifications as read
 * @param {ObjectId} userId
 * @returns {Promise<void>}
 */
const markAllAsRead = async (userId) => {
  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

/**
 * delete notification
 * @param {ObjectId} notificationId
 * @returns {Promise<Notification>}
 */
const deleteNotification = async (notificationId) => {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  notification.status = 'DELETED';
  await notification.save();
  return notification;
};

module.exports = {
  createNotification,
  queryNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
