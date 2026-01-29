const { getIo } = require('../config/socket');
const logger = require('../config/logger');

/**
 * Emit event to a specific user
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
const emitToUser = (userId, event, data) => {
  try {
    const io = getIo();
    io.to(userId.toString()).emit(event, data);
  } catch (error) {
    logger.error(`Socket emission error: ${error.message}`);
  }
};

/**
 * Emit event to all users with a specific role
 * @param {string} role
 * @param {string} event
 * @param {object} data
 */
const emitToRole = (role, event, data) => {
  try {
    const io = getIo();
    io.to(role).emit(event, data);
  } catch (error) {
    logger.error(`Socket emission error: ${error.message}`);
  }
};

/**
 * Emit event to multiple users
 * @param {Array<string>} userIds
 * @param {string} event
 * @param {object} data
 */
const emitToMultipleUsers = (userIds, event, data) => {
  try {
    const io = getIo();
    userIds.forEach((userId) => {
      io.to(userId.toString()).emit(event, data);
    });
  } catch (error) {
    logger.error(`Socket emission error: ${error.message}`);
  }
};

module.exports = {
  emitToUser,
  emitToRole,
  emitToMultipleUsers,
};
