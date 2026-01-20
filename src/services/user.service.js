const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Report, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const Payment = require('../models/payment.model');
const tokenService = require('./token.service');
const smsService = require('./sms.service');
const emailService = require('./email.service');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  const { email, phone } = userBody;

  if (!email && !phone) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Either email or phone is required');
  }

  if (email && (await User.isEmailTaken(email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  if (phone && (await User.isPhoneTaken(phone))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }

  const user = await User.create(userBody);
  return user;
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const { role, status, from, to, minSpent, maxSpent, ...otherFilters } = filter;
  const mongoFilter = { ...otherFilters };

  if (role) {
    mongoFilter.role = role;
  }

  if (status && status !== 'all') {
    if (status === 'suspended') {
      mongoFilter.isSuspended = true;
    } else if (status === 'active') {
      mongoFilter.isSuspended = false;
    }
  }

  if (from || to) {
    mongoFilter.createdAt = {};
    if (from) {
      mongoFilter.createdAt.$gte = new Date(from);
    }
    if (to) {
      mongoFilter.createdAt.$lte = new Date(to);
    }
  }

  if (minSpent !== undefined || maxSpent !== undefined) {
    const min = minSpent ? parseInt(minSpent, 10) : 0;
    const max = maxSpent ? parseInt(maxSpent, 10) : Infinity;

    const matchingStats = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: '$buyerId',
          totalSpent: { $sum: '$totalAmount' },
        },
      },
      {
        $match: {
          totalSpent: { $gte: min, $lte: max },
        },
      },
    ]);

    const matchingUserIds = matchingStats.map((stat) => stat._id);
    if (matchingUserIds.length > 0) {
      mongoFilter._id = { $in: matchingUserIds };
    } else {
      mongoFilter._id = { $in: [] };
    }
  }

  const users = await User.paginate(mongoFilter, options);

  const userIds = users.results.map((user) => user.id);
  const stats = await Order.aggregate([
    {
      $match: {
        buyerId: { $in: userIds.map((id) => mongoose.Types.ObjectId(id)) },
        status: { $ne: 'CANCELLED' },
      },
    },
    {
      $group: {
        _id: '$buyerId',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
      },
    },
  ]);

  const statsMap = stats.reduce((acc, stat) => {
    acc[stat._id.toString()] = stat;
    return acc;
  }, {});

  users.results = users.results.map((user) => {
    const userStats = statsMap[user.id] || { totalOrders: 0, totalSpent: 0 };
    return {
      ...user.toJSON(),
      totalOrders: userStats.totalOrders,
      totalSpent: userStats.totalSpent,
    };
  });

  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

const getUserByPhone = async (phone) => {
  return User.findOne({ phone });
};

const getUserByEmailOrPhone = async (email, phone) => {
  if (!email && !phone) {
    return null;
  }

  const query = {
    $or: [],
  };

  if (email) {
    query.$or.push({ email: email.toLowerCase() });
  }

  if (phone) {
    query.$or.push({ phone });
  }

  return User.findOne(query);
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

/**
 * Change password
 * @param {ObjectId} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<User>}
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (!(await user.isPasswordMatch(currentPassword))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect current password');
  }
  user.password = newPassword;
  await user.save();
  return user;
};

/**
 * Delete account with password confirmation
 * @param {ObjectId} userId
 * @param {string} password
 * @returns {Promise<User>}
 */
const deleteAccount = async (userId, password) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (!(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect password');
  }
  user.isActive = false;
  await user.save();
  return user;
};

/**
 * Report a user
 * @param {ObjectId} reporterId
 * @param {ObjectId} reportedId
 * @param {Object} reportBody
 * @returns {Promise<Report>}
 */
const reportUser = async (reporterId, reportedId, reportBody) => {
  const reportedUser = await getUserById(reportedId);
  if (!reportedUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const report = await Report.create({
    reporterId,
    reportedId,
    ...reportBody,
  });

  reportedUser.isReported = true;
  await reportedUser.save();

  return report;
};


const getMyTransactions = async (userId, query) => {
  const { range = 'all', page = 1, limit = 10 } = query;

  const skip = (page - 1) * limit;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const match = {
    status: 'Payment success',
    type: 'PayIn',
  };

  if (user.role === 'SELLER') {
    match.sellerId = new mongoose.Types.ObjectId(userId);
  } else {
    match.buyerId = new mongoose.Types.ObjectId(userId);
  }

  // Date filter
  if (range !== 'all') {
    const fromDate = new Date();

    if (range === '30') fromDate.setDate(fromDate.getDate() - 30);
    if (range === '60') fromDate.setDate(fromDate.getDate() - 60);
    if (range === '90') fromDate.setDate(fromDate.getDate() - 90);

    match.createdAt = { $gte: fromDate };
  }

  // This week start
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const pipeline = [
    { $match: match },

    {
      $lookup: {
        from: 'users',
        let: {
          otherUserId:
            user.role === 'SELLER' ? '$buyerId' : '$sellerId',
        },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$otherUserId'] },
            },
          },
          {
            $project: {
              name: 1,
              profile: 1,
            },
          },
        ],
        as: 'otherUser',
      },
    },
    { $unwind: '$otherUser' },

    {
      $facet: {
        transactions: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              amount: { $toDouble: '$amount' },
              currency: 1,
              createdAt: 1,
              reference: 1,
              user: '$otherUser',
            },
          },
        ],

        totalEarnings: [
          {
            $group: {
              _id: null,
              total: { $sum: { $toDouble: '$amount' } },
            },
          },
        ],

        thisWeekEarnings: [
          { $match: { createdAt: { $gte: startOfWeek } } },
          {
            $group: {
              _id: null,
              total: { $sum: { $toDouble: '$amount' } },
            },
          },
        ],

        count: [{ $count: 'total' }],
      },
    },
  ];

  const result = await Payment.aggregate(pipeline);

  return {
    totalEarnings:
      user.role === 'SELLER'
        ? result[0].totalEarnings[0]?.total || 0
        : 0,

    thisWeekEarnings:
      user.role === 'SELLER'
        ? result[0].thisWeekEarnings[0]?.total || 0
        : 0,

    transactions: result[0].transactions,

    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: result[0].count[0]?.total || 0,
    },
  };
};


/**
 * Suspend user by id
 * @param {ObjectId} userId
 * @param {string} reason
 * @returns {Promise<User>}
 */
const suspendUserById = async (userId, reason) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  user.isSuspended = true;
  await user.save();
  return user;
};

/**
 * Reactivate user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const reactivateUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  user.isSuspended = false;
  await user.save();
  return user;
};

/**
 * Get reset password link
 * @param {ObjectId} userId
 * @returns {Promise<string>}
 */
const getResetPasswordLink = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const resetPasswordToken = await tokenService.generateResetPasswordToken(user.id);
  if (user.email) {
    await emailService.sendResetPasswordEmail(user.email, resetPasswordToken);
  } else if (user.phone) {
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;
    await smsService.sendResetPasswordLink(user.phone, link);
  }
};

const getSellersList = async (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const pipeline = [
    {
      $match: { role: 'SELLER' },
    },

    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'products',
      },
    },

    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'orders',
      },
    },

    {
      $lookup: {
        from: 'payments',
        let: { sellerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$sellerId', '$$sellerId'] },
                  { $eq: ['$type', 'Payout'] },
                  { $eq: ['$status', 'Payout success'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalEarnings: {
                $sum: { $toDouble: '$amount' },
              },
            },
          },
        ],
        as: 'earnings',
      },
    },

    {
      $addFields: {
        totalListings: { $size: '$products' },
        totalOrders: { $size: '$orders' },
        earnings: {
          $ifNull: [{ $arrayElemAt: ['$earnings.totalEarnings', 0] }, 0],
        },
        idStatus: {
          $cond: [{ $eq: ['$isAccountVerified', true] }, 'Verified', 'Pending'],
        },
        status: {
          $cond: [{ $eq: ['$isBlocked', true] }, 'Suspended', 'Active'],
        },
      },
    },

    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        profile: 1,
        createdAt: 1,
        totalListings: 1,
        totalOrders: 1,
        earnings: 1,
        idStatus: 1,
        status: 1,
      },
    },

    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await User.aggregate(pipeline);

  const sellers = result[0].data;
  const total = result[0].total[0]?.count || 0;

  return {
    data: sellers,
    meta: {
      page,
      limit,
      totalResults: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};


const getSellerDetails = async (sellerId) => {
  const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

  const [result] = await User.aggregate([
    {
      $match: {
        _id: sellerObjectId,
        role: 'SELLER',
      },
    },


    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'products',
      },
    },

    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'orders',
      },
    },

    {
      $lookup: {
        from: 'payments',
        let: { sellerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$sellerId', '$$sellerId'] },
                  { $eq: ['$type', 'Payout'] },
                  { $eq: ['$status', 'Payout success'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $toDouble: '$amount' } },
            },
          },
        ],
        as: 'earnings',
      },
    },

    {
      $addFields: {
        totalListings: { $size: '$products' },
        totalOrders: { $size: '$orders' },
        completedOrders: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $eq: ['$$order.status', 'Completed'] },
            },
          },
        },
        totalEarnings: {
          $ifNull: [{ $arrayElemAt: ['$earnings.total', 0] }, 0],
        },
        verificationStatus: {
          $cond: [{ $eq: ['$isAccountVerified', true] }, 'Verified', 'Pending'],
        },
        status: {
          $cond: [{ $eq: ['$isBlocked', true] }, 'Suspended', 'Active'],
        },
      },
    },

    {
      $project: {
        stats: {
          totalOrders: '$totalOrders',
          completedOrders: '$completedOrders',
          totalListings: '$totalListings',
          totalEarnings: '$totalEarnings',
        },
        seller: {
          _id: '$_id',
          name: '$name',
          email: '$email',
          phone: '$phone',
          profile: '$profile',
          address: '$address',
          bio: '$bio',
          governmentId: '$governmentId',
          joinedAt: '$createdAt',
          status: '$status',
          verificationStatus: '$verificationStatus',
        },
      },
    },
  ]);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Seller not found');
  }

  return result;
};
/**
 * Get fraud reports by user id
 * @param {ObjectId} userId
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getFraudReportsByUserId = async (userId, options) => {
  const filter = { reportedId: userId };
  const reports = await Report.paginate(filter, { ...options, populate: 'reporterId' });
  return reports;
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  getUserByPhone,
  getUserByEmailOrPhone,
  changePassword,
  deleteAccount,
  reportUser,
  getMyTransactions,
  suspendUserById,
  reactivateUserById,
  getResetPasswordLink,
  getSellersList,
  getSellerDetails,
  getFraudReportsByUserId,
};
