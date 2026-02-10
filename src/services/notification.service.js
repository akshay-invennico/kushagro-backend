const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Notification = require('../models/notification.model');
const admin = require('../config/firebase');
const User = require('../models/user.model');
const { emitToUser } = require('./socket.service');

/**
 * create notification
 * @param {Object} notificationBody
 * @returns {Promise<Notification>}
 */
const createNotification = async (notificationBody) => {
  const notification = await Notification.create(notificationBody);
  emitToUser(notification.recipient, 'notification', notification);
  return notification;
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
 * get notification count
 * @param {Object} filter
 * @returns {Promise<number>}
 */
const getNotificationCount = async (filter) => {
  return Notification.countDocuments(filter);
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




/**
 * Send push notification to users by role
 */
const sendPushNotificationByRole = async ({
  title,
  body,
  userType,
  notificationType,
}) => {
  const userFilter = {
    isActive: true,
    isBlocked: false,
    isSuspended: false,
    fcmToken: { $ne: null },
  };

  if (userType !== 'ALL') {
    userFilter.role = userType;
  }

  const users = await User.find(userFilter).select('_id fcmToken');

  if (!users.length) {
    return {
      success: 0,
      failed: 0,
      message: 'No users found for this notification',
    };
  }

  const notificationsToInsert = users.map((user) => ({
    recipient: user._id,
    title,
    message: body,
    type: notificationType || 'GENERAL',
    data: {},
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  }));

  await Notification.insertMany(notificationsToInsert);

  const tokens = users.map((u) => u.fcmToken);

  const payload = {
    notification: {
      title,
      body,
    },
    data: {
      notificationType,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
  };

  let successCount = 0;
  let failureCount = 0;
  const chunkSize = 500;

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const tokenChunk = tokens.slice(i, i + chunkSize);

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokenChunk,
        ...payload,
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((res, index) => {
        if (!res.success) {
          const errorCode = res.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            User.updateOne(
              { fcmToken: tokenChunk[index] },
              { $set: { fcmToken: null } }
            ).exec();
          }
        }
      });
    } catch (error) {
      failureCount += tokenChunk.length;
      console.error('FCM batch error:', error.message);
    }
  }

  return {
    success: successCount,
    failed: failureCount,
  };
};

/**
 * Send real-time notification without storing (optional)
 * @param {string} userId
 * @param {string} title
 * @param {string} message
 * @param {object} data
 */
const sendRealTimeOnly = (userId, title, message, data = {}) => {
  emitToUser(userId, 'notification_direct', {
    title,
    message,
    data,
    createdAt: new Date(),
  });
};




module.exports = {
  createNotification,
  queryNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendPushNotificationByRole,
  sendRealTimeOnly,
  getNotificationCount,
};
