const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { User, Order, Product, Payment } = require('../models');
const { sendSellerVerificationEmail } = require('./email.service');

/**
 * Calculate stats and growth
 * @param {Model} model
 * @param {Object} filter
 * @param {String} type - 'count' or 'sum'
 * @param {String} sumField - field to sum if type is 'sum'
 * @returns {Promise<Object>}
 */
const calculateStats = async (model, filter = {}, type = 'count', sumField = null) => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const totalFilter = { ...filter };
  let total = 0;
  if (type === 'count') {
    total = await model.countDocuments(totalFilter);
  } else if (type === 'sum') {
    const result = await model.aggregate([
      { $match: totalFilter },
      { $group: { _id: null, total: { $sum: `$${sumField}` } } },
    ]);
    total = result.length > 0 ? result[0].total : 0;
  }

  const thisMonthFilter = {
    ...filter,
    createdAt: { $gte: startOfThisMonth },
  };
  let thisMonth = 0;
  if (type === 'count') {
    thisMonth = await model.countDocuments(thisMonthFilter);
  } else if (type === 'sum') {
    const result = await model.aggregate([
      { $match: thisMonthFilter },
      { $group: { _id: null, total: { $sum: `$${sumField}` } } },
    ]);
    thisMonth = result.length > 0 ? result[0].total : 0;
  }

  const lastMonthFilter = {
    ...filter,
    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
  };
  let lastMonth = 0;
  if (type === 'count') {
    lastMonth = await model.countDocuments(lastMonthFilter);
  } else if (type === 'sum') {
    const result = await model.aggregate([
      { $match: lastMonthFilter },
      { $group: { _id: null, total: { $sum: `$${sumField}` } } },
    ]);
    lastMonth = result.length > 0 ? result[0].total : 0;
  }

  let percentageGrowth = 0;
  if (lastMonth > 0) {
    percentageGrowth = ((thisMonth - lastMonth) / lastMonth) * 100;
  } else if (thisMonth > 0) {
    percentageGrowth = 100;
  }

  return {
    total,
    thisMonth,
    lastMonth,
    percentageGrowth: parseFloat(percentageGrowth.toFixed(2)),
  };
};

/**
 * Get dashboard stats
 * @returns {Promise<Object>}
 */
const getDashboardStats = async () => {
  const buyerStats = await calculateStats(User, { role: 'BUYER' });
  const sellerStats = await calculateStats(User, { role: 'SELLER' });
  const orderStats = await calculateStats(Order, {});
  const productStats = await calculateStats(Product, {});
  const revenueStats = await calculateStats(Order, { status: { $in: ['PAID', 'COMPLETED'] } }, 'sum', 'totalAmount');

  return {
    buyers: {
      total: buyerStats.total,
      thisMonth: buyerStats.thisMonth,
      growth: buyerStats.percentageGrowth,
    },
    sellers: {
      total: sellerStats.total,
      thisMonth: sellerStats.thisMonth,
      growth: sellerStats.percentageGrowth,
    },
    orders: {
      total: orderStats.total,
      thisMonth: orderStats.thisMonth,
      growth: orderStats.percentageGrowth,
    },
    listings: {
      total: productStats.total,
      thisMonth: productStats.thisMonth,
      growth: productStats.percentageGrowth,
    },
    revenue: {
      total: revenueStats.total,
      thisMonth: revenueStats.thisMonth,
      growth: revenueStats.percentageGrowth,
    },
  };
};

/**
 * Get recent orders
 * @returns {Promise<Object>}
 */
const getRecentOrders = async () => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('buyerId', 'name email profile')
    .populate('sellerId', 'name email profile')
    .select('orderNumber totalAmount status createdAt buyerId sellerId');

  return orders;
};

/**
 * Get recent payments
 * @returns {Promise<Object>}
 */
const getRecentPayments = async () => {
  const payments = await Payment.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({ path: 'sellerId', select: 'name email profile', model: 'User' })
    .select('reference amount status createdAt sellerId');

  return payments.map((payment) => ({
    ...payment.toJSON(),
    method: 'Flutterwave',
  }));
};

/**
 * Get order status stats (Pending vs Completed)
 * @returns {Promise<Object>}
 */
const getOrderStatusStats = async () => {
  const pendingCount = await Order.countDocuments({ status: { $in: ['ONGOING'] } });
  const completedCount = await Order.countDocuments({ status: { $in: ['PAID', 'COMPLETED'] } });

  return {
    pending: pendingCount,
    completed: completedCount,
  };
};

/**
 * Get top 5 categories by listings
 * @returns {Promise<Object>}
 */
const getTopCategories = async () => {
  const topCategories = await Product.aggregate([
    {
      $group: {
        _id: '$categoryId',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    {
      $unwind: '$category',
    },
    {
      $project: {
        _id: 1,
        categoryName: '$category.name',
        currentListings: '$count',
      },
    },
  ]);

  return topCategories;
};

/**
 * Get revenue report
 * @param {number} year
 * @returns {Promise<Object>}
 */
const getRevenueReport = async (year) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

  const revenueData = await Order.aggregate([
    {
      $match: {
        status: { $in: ['PAID', 'COMPLETED'] },
        createdAt: {
          $gte: startOfYear,
          $lte: endOfYear,
        },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalRevenue: { $sum: '$totalAmount' },
      },
    },
  ]);

  const monthlyRevenue = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 1; i <= 12; i++) {
    const monthData = revenueData.find((item) => item._id === i);
    monthlyRevenue.push({
      month: monthNames[i - 1],
      revenue: monthData ? monthData.totalRevenue : 0,
    });
  }

  return monthlyRevenue;
};

/**
 * Get pending sellers
 * @returns {Promise<Object>}
 */
const getPendingSellers = async () => {
  const pendingSellers = await User.find({
    role: 'SELLER',
    identityVerificationStatus: { $in: ['PENDING'] },
    governmentId: { $ne: null },
  }).select('name email profile governmentId identityVerificationStatus');
  return pendingSellers;
};

/**
 * Verify seller
 * @param {String} sellerId
 * @param {String} status - 'APPROVED' or 'REJECTED'
 * @param {Array} reasons - Array of rejection reasons
 * @returns {Promise<Object>}
 */
const verifySeller = async (sellerId, status, reasons = []) => {
  const seller = await User.findById(sellerId);
  if (!seller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Seller not found');
  }

  if (status === 'APPROVED') {
    seller.identityVerificationStatus = 'APPROVED';
    seller.rejectionReasons = [];
    seller.isVerified = true;
    if (seller.email) {
      await sendSellerVerificationEmail(seller.email, seller.name, 'approved');
    }
  } else if (status === 'REJECTED') {
    seller.identityVerificationStatus = 'REJECTED';
    seller.rejectionReasons = reasons;
    seller.isVerified = false;
    if (seller.email) {
      const reasonText = reasons.join(', ');
      await sendSellerVerificationEmail(seller.email, seller.name, 'rejected', reasonText);
    }
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status');
  }

  await seller.save();
  return seller;
};

/**
 * Get seller dashboard stats
 * @param {String} sellerId
 * @returns {Promise<Object>}
 */
const getSellerStats = async (sellerId) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const totalOrders = await Order.countDocuments({ sellerId });
  const todaysOrders = await Order.countDocuments({ sellerId, createdAt: { $gte: startOfToday } });
  const deliveredOrders = await Order.countDocuments({ sellerId, status: 'COMPLETED' });
  const pendingOrders = await Order.countDocuments({ sellerId, status: 'ONGOING' });

  const totalListings = await Product.countDocuments({ sellerId });
  const activeListings = await Product.countDocuments({ sellerId, status: 'ACTIVE' });
  const inactiveListings = await Product.countDocuments({ sellerId, status: 'INACTIVE' });

  return {
    orders: {
      total: totalOrders,
      today: todaysOrders,
      delivered: deliveredOrders,
      ongoing: pendingOrders,
    },
    listings: {
      total: totalListings,
      active: activeListings,
      inactive: inactiveListings,
    },
  };
};

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
