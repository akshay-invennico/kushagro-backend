const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const orderValidation = require('../../validations/order.validation');

const {
  createOrder,
  getOrders,
  getorderById,
  updateOrder,
  sendOrderOtp,
  verifyOrderOtp,
} = require('../../controllers/order.controller');

const router = express.Router();

router.post('/create/order', validate(orderValidation.createOrder), createOrder);
router.get('/getall/order', auth(), validate(orderValidation.getAllOrders), getOrders);
router.get('/getbyId', validate(orderValidation.getOrderById), getorderById);
router.patch('/update/order', validate(orderValidation.updateOrder), updateOrder);
router.post('/sendotp', validate(orderValidation.sendOtpToBuyer), sendOrderOtp);
router.get('/verifyotp', validate(orderValidation.verifyOtpUpdateOrder), verifyOrderOtp);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management APIs
 */

/**
 * @swagger
 * /create/order:
 *   post:
 *     summary: Create order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - price
 *               - buyerId
 *               - sellerId
 *               - productId
 *             properties:
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               price:
 *                 type: number
 *               note:
 *                 type: string
 *               buyerId:
 *                 type: string
 *               sellerId:
 *                 type: string
 *               productId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /getall/order:
 *   get:
 *     summary: Get all orders by role and status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ongoing, completed]
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid status
 */

/**
 * @swagger
 * /getbyId:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details fetched
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /update/order:
 *   patch:
 *     summary: Complete order after payment
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Payment not completed
 */

/**
 * @swagger
 * /sendotp:
 *   post:
 *     summary: Send OTP to buyer (email or phone)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       404:
 *         description: Order or buyer not found
 */

/**
 * @swagger
 * /verifyotp:
 *   get:
 *     summary: Verify OTP and complete order
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: otp
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OTP verified and order completed
 *       400:
 *         description: Wrong OTP or payment not completed
 */
