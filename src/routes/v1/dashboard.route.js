const express = require('express');
const auth = require('../../middlewares/auth');
const dashboardController = require('../../controllers/dashboard.controller');

const router = express.Router();

router.get('/stats', auth(), dashboardController.getDashboardStats);
router.get('/recent/orders', auth(), dashboardController.getRecentOrders);
router.get('/recent/payments', auth(), dashboardController.getRecentPayments);
router.get('/order/status', auth(), dashboardController.getOrderStatusStats);
router.get('/top/categories', auth(), dashboardController.getTopCategories);
router.get('/revenue/report', auth(), dashboardController.getRevenueReport);
router.get('/seller/pending', auth(), dashboardController.getPendingSellers);
router.patch('/seller/verify/:sellerId', auth(), dashboardController.verifySeller);
router.get('/seller/stats', auth(), dashboardController.getSellerStats);

module.exports = router;
