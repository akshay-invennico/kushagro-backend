const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Notification = require('../models/notification.model');
const admin = require('../config/firebase');
const User = require('../models/user.model');
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

  const users = await User.find(userFilter).select('fcmToken');

  if (!users.length) {
    return {
      success: 0,
      failed: 0,
      message: 'No users found for this notification',
    };
  }

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
      // Do NOT break execution
      failureCount += tokenChunk.length;
      console.error('FCM batch error:', error.message);
    }
  }

  return {
    success: successCount,
    failed: failureCount,
  };
};



module.exports = {
  createNotification,
  queryNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendPushNotificationByRole
};
