const express = require('express');
const auth = require('../../middlewares/auth');
const ticketController = require('../../controllers/ticket.controller');

const router = express.Router();

router.route('/').post(auth(), ticketController.createTicket).get(auth(), ticketController.getTickets);

router.route('/:ticketId').get(auth(), ticketController.getTicketDetails).delete(auth(), ticketController.deleteTicket);

router.route('/status/:ticketId').patch(auth(), ticketController.updateTicketStatus);

module.exports = router;

/**
 * @swagger
 * /ticket:
 *   post:
 *     summary: Create a support ticket
 *     description: Authenticated users can create a support ticket with optional attachments
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 example: Refund Issue
 *               description:
 *                 type: string
 *                 example: Getting an unknown error while trying to log out
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /ticket:
 *   get:
 *     summary: Get support tickets
 *     description: Users get their own tickets, admins get all tickets
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, closed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List of tickets
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /ticket/{ticketId}:
 *   get:
 *     summary: Get ticket details
 *     description: Get detailed information of a specific support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         example: 65a1f2e9d5a0b11c8f8f1234
 *     responses:
 *       200:
 *         description: Ticket details fetched successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /ticket/{ticketId}:
 *   delete:
 *     summary: Delete a support ticket
 *     description: Users can delete their own open or in-progress tickets
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 */

/**
 * @swagger
 * /ticket/status/{ticketId}:
 *   patch:
 *     summary: Update ticket status
 *     description: Admin can update the status of a support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, closed]
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
