const express = require('express');
const validate = require('../../middlewares/validate');
const paymentValidation = require('../../validations/payment.validation');

const { createSellerBankAccount, paySeller, refundBuyer, getBankDetails } = require('../../controllers/payment.controller');

const router = express.Router();

router.post('/selleraccount', validate(paymentValidation.createSellerBankAccount), createSellerBankAccount);
router.post('/transfer/seller', validate(paymentValidation.paySeller), paySeller);
router.post('/refund/buyer', validate(paymentValidation.refundBuyer), refundBuyer);
router.get('/bank/details', validate(paymentValidation.getBankDetails), getBankDetails);

module.exports = router;

/**
 * @swagger
 * openapi: 3.0.0
 * info:
 *   title: Payment Service API
 *   description: APIs for seller bank accounts, payouts, refunds, and bank listings using Flutterwave
 *   version: 1.0.0
 * servers:
 *   - url: /api/v1
 */

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Payment, payout, refund, and bank APIs
 */

/**
 * ---------------------------------------------------------------------
 * CREATE SELLER BANK ACCOUNT
 * ---------------------------------------------------------------------
 */

/**
 * @swagger
 * /payment/selleraccount:
 *   post:
 *     summary: Create seller bank account (Flutterwave beneficiary)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerId
 *               - country
 *               - bankCode
 *               - accountNumber
 *               - firstName
 *               - lastName
 *               - fullName
 *               - bankName
 *               - phone
 *               - email
 *               - currency
 *             properties:
 *               sellerId:
 *                 type: string
 *                 example: "695b87524d56d662786cba1d"
 *               country:
 *                 type: string
 *                 example: "NG"
 *               bankCode:
 *                 type: string
 *                 example: "044"
 *               accountNumber:
 *                 type: string
 *                 example: "0690000031"
 *               firstName:
 *                 type: string
 *                 example: "Gyana"
 *               lastName:
 *                 type: string
 *                 example: "Das"
 *               fullName:
 *                 type: string
 *                 example: "Gyana das"
 *               bankName:
 *                 type: string
 *                 example: "Access Bank"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               email:
 *                 type: string
 *                 example: "john.doe@test.com"
 *               currency:
 *                 type: string
 *                 example: "NGN"
 *     responses:
 *       201:
 *         description: Seller bank account created successfully
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
 *                   example: "Seller bank account created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "696627f7fa32d4512808eea6"
 *                     sellerId:
 *                       type: string
 *                       example: "695b87524d56d662786cba1d"
 *                     country:
 *                       type: string
 *                       example: "NG"
 *                     email:
 *                       type: string
 *                       example: "john.doe@test.com"
 *                     phone:
 *                       type: string
 *                       example: "+2348012345678"
 *                     bankCode:
 *                       type: string
 *                       example: "044"
 *                     bank_name:
 *                       type: string
 *                       example: "Access Bank"
 *                     account_holder_firstname:
 *                       type: string
 *                       example: "Gyana"
 *                     account_holder_lastname:
 *                       type: string
 *                       example: "Das"
 *                     account_holder_fullname:
 *                       type: string
 *                       example: "Gyana das"
 *                     accountNumber:
 *                       type: string
 *                       example: "0031"
 *                     fullAccountNumber:
 *                       type: string
 *                       example: "0690000031"
 *                     recipient_code:
 *                       type: string
 *                       example: "42401"
 *                     currency:
 *                       type: string
 *                       example: "NGN"
 *                     status:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       example: "2026-01-13T11:09:43.384Z"
 */

/**
 * ---------------------------------------------------------------------
 * SELLER PAYOUT
 * ---------------------------------------------------------------------
 */

/**
 * @swagger
 * /payment/transfer/seller:
 *   post:
 *     summary: Initiate seller payout
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerId
 *               - orderId
 *             properties:
 *               sellerId:
 *                 type: string
 *                 example: "695b87524d56d662786cba1d"
 *               orderId:
 *                 type: string
 *                 example: "69661a5d325eea6568381ca3"
 *     responses:
 *       200:
 *         description: Seller payout initiated successfully
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
 *                   example: "Seller payout initiated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 2095833
 *                     account_number:
 *                       type: string
 *                       example: "0690000031"
 *                     bank_code:
 *                       type: string
 *                       example: "044"
 *                     full_name:
 *                       type: string
 *                       example: "Forrest Green"
 *                     currency:
 *                       type: string
 *                       example: "NGN"
 *                     amount:
 *                       type: number
 *                       example: 6600
 *                     fee:
 *                       type: number
 *                       example: 26.875
 *                     status:
 *                       type: string
 *                       example: "NEW"
 *                     reference:
 *                       type: string
 *                       example: "PAYOUT_69661a5d325eea6568381ca3_1768551030602"
 *                     narration:
 *                       type: string
 *                       example: "Seller payout for order 314902"
 *                     bank_name:
 *                       type: string
 *                       example: "ACCESS BANK NIGERIA"
 */

/**
 * ---------------------------------------------------------------------
 * REFUND BUYER
 * ---------------------------------------------------------------------
 */

/**
 * @swagger
 * /payment/refund/buyer:
 *   post:
 *     summary: Refund buyer for an order
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - reason
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "6965f8bc0583f946fc7ee2af"
 *               reason:
 *                 type: string
 *                 example: "this is for testing basically"
 *     responses:
 *       200:
 *         description: Refund initiated successfully
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
 *                   example: "Refund initiated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 97467
 *                     amount_refunded:
 *                       type: number
 *                       example: 6660
 *                     status:
 *                       type: string
 *                       example: "completed"
 *                     flw_ref:
 *                       type: string
 *                       example: "flwm3s4m0c1768290527760"
 *                     destination:
 *                       type: string
 *                       example: "payment_source"
 *                     comments:
 *                       type: string
 *                       example: "this is for testing basically"
 *                     created_at:
 *                       type: string
 *                       example: "2026-01-13T08:24:53.000Z"
 */

/**
 * ---------------------------------------------------------------------
 * FETCH BANK DETAILS
 * ---------------------------------------------------------------------
 */

/**
 * @swagger
 * /payment/bank/details:
 *   get:
 *     summary: Fetch bank list by country
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *           example: "NG"
 *     responses:
 *       200:
 *         description: Bank list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Access Bank"
 *                   code:
 *                     type: string
 *                     example: "044"
 */
