const express = require('express');
const auth = require('../../middlewares/auth');
const ratingController = require('../../controllers/rating.controller');

const router = express.Router();

router.route('/').post(auth(), ratingController.createRating).get(auth(), ratingController.getRatings);

router.route('/:ratingId').delete(auth(), ratingController.deleteRating);

router.get('/seller/:sellerId', auth(), ratingController.getSellerRatingsById);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Seller ratings and reviews management
 */
/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Create a seller rating
 *     description: Buyer can submit a rating and review for a seller
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerId
 *               - rating
 *             properties:
 *               sellerId:
 *                 type: string
 *                 example: 695b87524d56d662786cba1d
 *               orderId:
 *                 type: string
 *                 example: 6964ce98165e89226cf03234
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               review:
 *                 type: string
 *                 example: Amazing seller! Fast delivery.
 *     responses:
 *       201:
 *         description: Rating submitted successfully
 *       400:
 *         description: Invalid input or duplicate rating
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /ratings:
 *   get:
 *     summary: Get ratings
 *     description: Get ratings list (admin sees all, seller sees own, buyer sees given)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sellerId
 *         schema:
 *           type: string
 *         description: Filter ratings by seller ID
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *     responses:
 *       200:
 *         description: Ratings fetched successfully
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /ratings/seller/{sellerId}:
 *   get:
 *     summary: Get seller ratings and statistics
 *     description: Returns paginated reviews along with average rating and total review count
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         example: 695b87524d56d662786cba1d
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *     responses:
 *       200:
 *         description: Seller ratings fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                           example: 4.7
 *                         totalReviews:
 *                           type: number
 *                           example: 36
 *                     reviews:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Seller not found
 */
/**
 * @swagger
 * /ratings/{ratingId}:
 *   delete:
 *     summary: Delete a rating
 *     description: Admin can soft-delete a rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 6964d1ace08206393c16b36f
 *     responses:
 *       200:
 *         description: Rating deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating not found
 */
