const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { dashboardService } = require('../services');

const getDashboardStats = catchAsync(async (_req, res) => {
  const stats = await dashboardService.getDashboardStats();
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Dashboard stats retrieved successfully',
    data: stats,
  });
});

const getRecentOrders = catchAsync(async (_req, res) => {
  const orders = await dashboardService.getRecentOrders();
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Recent orders retrieved successfully',
    data: orders,
  });
});

const getRecentPayments = catchAsync(async (_req, res) => {
  const payments = await dashboardService.getRecentPayments();
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Recent payments retrieved successfully',
    data: payments,
  });
});

const getOrderStatusStats = catchAsync(async (_req, res) => {
  const stats = await dashboardService.getOrderStatusStats();
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Order status stats retrieved successfully',
    data: stats,
  });
});

const getTopCategories = catchAsync(async (_req, res) => {
  const categories = await dashboardService.getTopCategories();
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Top categories retrieved successfully',
    data: categories,
  });
});

const getRevenueReport = catchAsync(async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const report = await dashboardService.getRevenueReport(parseInt(year));
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Revenue report retrieved successfully',
    data: report,
  });
});

const getPendingSellers = catchAsync(async (_req, res) => {
  const sellers = await dashboardService.getPendingSellers();
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Pending sellers retrieved successfully',
    data: sellers,
  });
});

const verifySeller = catchAsync(async (req, res) => {
  const { sellerId } = req.params;
  const { status, reasons } = req.body;
  const seller = await dashboardService.verifySeller(sellerId, status, reasons);
  res.status(httpStatus.OK).send({
    success: true,
    message: `Seller verification ${status.toLowerCase()} successfully`,
    data: seller,
  });
});

const getSellerStats = catchAsync(async (req, res) => {
  const sellerId = req.user.id;
  const stats = await dashboardService.getSellerStats(sellerId);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Seller stats retrieved successfully',
    data: stats,
  });
});

module.exports = {
  getDashboardStats,
  getRecentOrders,
  getRecentPayments,
  getOrderStatusStats,
  getTopCategories,
  getRevenueReport,
  getPendingSellers,
  verifySeller,
  getSellerStats,
};
