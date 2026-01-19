const express = require('express');
const auth = require('../../middlewares/auth');
const notificationController = require('../../controllers/notification.controller');

const router = express.Router();

router.route('/').get(auth(), notificationController.getNotifications);
router.route('/read/all').patch(auth(), notificationController.markAllRead);
router.route('/:notificationId').delete(auth(), notificationController.deleteNotification);
router.route('/read/:notificationId').patch(auth(), notificationController.markRead);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management
 */

/**
 * @swagger
 * /notification:
 *   get:
 *     summary: Get all notification
 *     description: Retrieve all notification for the current user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of notification
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 */

/**
 * @swagger
 * /notification/read/all:
 *   patch:
 *     summary: Mark all notification as read
 *     description: Mark all notification as read for the current user with READ status
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 */

/**
 * @swagger
 * /notification/read/{notificationId}:
 *   patch:
 *     summary: Mark a notification as read
 *     description: Mark a specific notification as read.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: NotificationId
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: Not found
 */

/**
 * @swagger
 * /notification/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Soft delete a notification.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: NotificationId
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: Not found
 */
