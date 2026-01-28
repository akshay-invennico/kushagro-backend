const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const reportValidation = require('../../validations/report.validation');
const reportController = require('../../controllers/report.controller');

const router = express.Router();

router.route('/').get(auth('manageUsers'), validate(reportValidation.getAllReports), reportController.getAllReports);
router
  .route('/user/:userId')
  .post(auth('manageUsers'), validate(reportValidation.reportUser), reportController.reportUser)
  .get(auth('manageUsers'), validate(reportValidation.getReportsByUserId), reportController.getReportsByUserId);

router
  .route('/by/:userId')
  .get(auth('manageUsers'), validate(reportValidation.getReportsMadeByUser), reportController.getReportsMadeByUser);

router.route('/:reportId').get(auth('manageUsers'), validate(reportValidation.getReportById), reportController.getReportById)
router.route('/delete').delete(auth('manageUsers'), reportController.deleteReport);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: User reporting and fraud management
 */

/**
 * @swagger
 * /report/user/{userId}:
 *   post:
 *     summary: Report a user
 *     description: Allows an authorized user to report another user for inappropriate behavior.
 *     tags: [Reports]
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
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 example: ["Inappropriate Behaviour", "Fraud"]
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

/**
 * @swagger
 * /report:
 *   get:
 *     summary: Get all reports (Admin)
 *     description: Admin endpoint to retrieve all reports with filtering and pagination.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportedId
 *         schema:
 *           type: string
 *         description: Filter by reported user ID
 *       - in: query
 *         name: reporterId
 *         schema:
 *           type: string
 *         description: Filter by reporter user ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reports from date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reports to date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         example: createdAt:desc
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
 *         description: Reports fetched successfully
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
 *                   example: Reports fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 meta:
 *                   type: object
 *                   properties:
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
 * /report/user/{userId}:
 *   get:
 *     summary: Get reports by user ID
 *     description: Get all reports made against a specific user.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to get reports for
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         example: createdAt:desc
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
 *         description: Reports fetched successfully
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
 *                   example: Reports fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 meta:
 *                   type: object
 *                   properties:
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
 *       "404":
 *         description: User not found
 */

/**
 * @swagger
 * /report/{reportId}:
 *   delete:
 *     summary: Delete a report
 *     description: Hard delete a report by ID (Admin only).
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the report to delete
 *     responses:
 *       "200":
 *         description: Report deleted successfully
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
 *                   example: Report deleted successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: Report not found
 */
