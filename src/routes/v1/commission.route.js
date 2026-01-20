const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const commissionValidation = require('../../validations/commission.validation');
const commissionController = require('../../controllers/commission.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageCommission'), validate(commissionValidation.createCommission), commissionController.createCommission)
  .get(auth('manageCommission'), validate(commissionValidation.getCommission), commissionController.getCommission);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Commission
 *   description: Commission and Tax settings management
 */

/**
 * @swagger
 * /commission:
 *   post:
 *     summary: Create or update commission settings
 *     description: Only admins can create or update commission settings. ensuring a single configuration exists.
 *     tags: [Commission]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taxPercentage
 *             properties:
 *               taxPercentage:
 *                 type: number
 *                 description: Global tax rate percentage (0-100)
 *               isPlatformChargesApplied:
 *                 type: boolean
 *                 description: Whether platform charges are applied
 *               platformCharges:
 *                 type: number
 *                 description: Fixed platform charge amount
 *               isCommissionEnabled:
 *                 type: boolean
 *                 description: Whether commission is enabled
 *               commissionPercentage:
 *                 type: number
 *                 description: Commission percentage (0-100)
 *               minimumOrderValue:
 *                 type: number
 *                 description: Minimum order value eligible for commission
 *             example:
 *               taxPercentage: 18
 *               isPlatformChargesApplied: true
 *               platformCharges: 50
 *               isCommissionEnabled: true
 *               commissionPercentage: 10
 *               minimumOrderValue: 500
 *     responses:
 *       "201":
 *         description: Created or Updated
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                  message:
 *                    type: string
 *                  data:
 *                    $ref: '#/components/schemas/Commission'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get commission settings
 *     description: Retrieve the current commission and tax settings.
 *     tags: [Commission]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                  message:
 *                    type: string
 *                  data:
 *                    $ref: '#/components/schemas/Commission'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
