const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.route('/').get(auth('getUser'), validate(userValidation.getUser), userController.getUser);
router.route('/all').get(auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);
router.route('/:userId').patch(auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser);
router
  .route('/change/password')
  .post(auth('manageUsers'), validate(userValidation.changePassword), userController.changePassword);
router
  .route('/delete/account')
  .patch(auth('manageUsers'), validate(userValidation.deleteAccount), userController.deleteAccount);
router.route('/report/:userId').post(auth('manageUsers'), validate(userValidation.reportUser), userController.reportUser);
router.get('/transactions', auth(), userController.getMyTransactions);

router.route('/:userId/suspend').post(auth('manageUsers'), validate(userValidation.suspendUser), userController.suspendUser);

router
  .route('/:userId/reactivate')
  .post(auth('manageUsers'), validate(userValidation.reactivateUser), userController.reactivateUser);

router
  .route('/:userId/reset/link')
  .get(auth('manageUsers'), validate(userValidation.getResetPasswordLink), userController.getResetPasswordLink);

router.get('/seller', userController.getSellers);
router.get('/sellerdata/:sellerId', userController.getSellerDetails);
router.route('/:userId/reports').get(auth('manageUsers'), userController.getFraudReports);
router.patch('/savefcm/:userId', validate(userValidation.saveFcmToken), userController.saveFcmToken);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and user management
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get users or logged-in user
 *     description: |
 *       - Admin users can retrieve a paginated list of all users.
 *       - Non-admin users retrieve their own user profile.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by user name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by user role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         example: name:asc
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *     responses:
 *       "200":
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users:
 *   patch:
 *     summary: Update logged-in user profile
 *     description: Logged-in users can update their own profile information.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       "200":
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/change/password:
 *   post:
 *     summary: Change password
 *     description: Logged-in users can change their password.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/delete/account:
 *   patch:
 *     summary: Delete account
 *     description: Logged-in users can delete their account.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *               reason:
 *                  type: string
 *               options:
 *                  type: array
 *                  items:
 *                    type: string
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/report/{userId}:
 *   post:
 *     summary: Report a user
 *     description: Allows an authorized user to report another user for inappropriate behavior.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user being reported
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Inappropriate Behaviour
 *               image:
 *                 type: string
 *                 format: uri
 *                 example: https://example-bucket.s3.amazonaws.com/images/report.png
 *     responses:
 *       "200":
 *         description: User reported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User reported successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 meta:
 *                   type: object
 *                   example: {}
 *                 error:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: User not found
 *       "400":
 *         description: Invalid request payload
 */
