const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const Payment = require('../models/payment.model');
const tokenService = require('./token.service');
const smsService = require('./sms.service');
const emailService = require('./email.service');
const { sendVerificationEmail } = require('./email.service');
const { sendOtpSms } = require('./sms.service');

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
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect current password');
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
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect password');
  }
  user.isActive = false;
  await user.save();
  return user;
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
  user.isActive = false;
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
  user.isActive = true;
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

  const {
    status,
    idStatus,
    joinFrom,
    joinTo,
    earningFrom,
    earningTo,
    orderFrom,
    orderTo,
    listingFrom,
    listingTo,
  } = query;

  const matchStage = { role: 'SELLER' };

  if (status === 'Active') matchStage.isSuspended = false;
  if (status === 'Suspended') matchStage.isSuspended = true;

  if (idStatus === 'Verified') {
    matchStage.identityVerificationStatus = 'APPROVED';
  }

  if (idStatus === 'Pending') {
    matchStage.identityVerificationStatus = 'PENDING';
  }

  if (idStatus === 'Rejected') {
    matchStage.identityVerificationStatus = 'REJECTED';
  }


  /** Join Date filter */
  if (joinFrom || joinTo) {
    matchStage.createdAt = {};
    if (joinFrom) matchStage.createdAt.$gte = new Date(joinFrom);
    if (joinTo) matchStage.createdAt.$lte = new Date(joinTo);
  }

  const pipeline = [
    { $match: matchStage },

    /** Products */
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'products',
      },
    },

    /** Orders */
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'orders',
      },
    },

    /** Earnings */
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
              totalEarnings: { $sum: { $toDouble: '$amount' } },
            },
          },
        ],
        as: 'earnings',
      },
    },

    /** Computed fields */
    {
      $addFields: {
        totalListings: { $size: '$products' },
        totalOrders: { $size: '$orders' },
        earnings: {
          $ifNull: [{ $arrayElemAt: ['$earnings.totalEarnings', 0] }, 0],
        },
        idStatus: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$identityVerificationStatus', 'APPROVED'] },
                then: 'Verified',
              },
              {
                case: { $eq: ['$identityVerificationStatus', 'REJECTED'] },
                then: 'Rejected',
              },
            ],
            default: 'Pending',
          },
        },
        status: {
          $cond: ['$isSuspended', 'Suspended', 'Active'],
        },
      },
    },

    /** -----------------------------
     * Range filters (post-compute)
     ------------------------------ */
    {
      $match: {
        ...(earningFrom || earningTo
          ? {
            earnings: {
              ...(earningFrom && { $gte: Number(earningFrom) }),
              ...(earningTo && { $lte: Number(earningTo) }),
            },
          }
          : {}),

        ...(orderFrom || orderTo
          ? {
            totalOrders: {
              ...(orderFrom && { $gte: Number(orderFrom) }),
              ...(orderTo && { $lte: Number(orderTo) }),
            },
          }
          : {}),

        ...(listingFrom || listingTo
          ? {
            totalListings: {
              ...(listingFrom && { $gte: Number(listingFrom) }),
              ...(listingTo && { $lte: Number(listingTo) }),
            },
          }
          : {}),
      },
    },

    /** Projection */
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
        isVerified: 1,
        identityVerificationStatus: 1,
      },
    },

    /** Pagination */
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

  const [seller] = await User.aggregate([
    {
      $match: {
        _id: sellerObjectId,
        role: 'SELLER',
      },
    },

    /** Products */
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'products',
      },
    },

    /** Orders */
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'sellerId',
        as: 'orders',
      },
    },

    /** Earnings */
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
              totalEarnings: { $sum: { $toDouble: '$amount' } },
            },
          },
        ],
        as: 'earnings',
      },
    },

    /** Reviews */
    {
      $lookup: {
        from: 'reviews',
        let: { sellerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$sellerId', '$$sellerId'] },
            },
          },
          {
            $project: {
              rating: 1,
              review: 1,
              buyerId: 1,
              createdAt: 1,
            },
          },
        ],
        as: 'reviews',
      },
    },

    /** Fraud Reports */
    {
      $lookup: {
        from: 'frauds',
        let: { sellerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$reportedId', '$$sellerId'] },
            },
          },
          {
            $project: {
              reason: 1,
              image: 1,
              reporterId: 1,
              createdAt: 1,
            },
          },
        ],
        as: 'frauds',
      },
    },

    /** Computed fields */
    {
      $addFields: {
        totalListings: { $size: '$products' },
        totalOrders: { $size: '$orders' },

        earnings: {
          $ifNull: [{ $arrayElemAt: ['$earnings.totalEarnings', 0] }, 0],
        },

        totalReviews: { $size: '$reviews' },
        averageRating: {
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            { $avg: '$reviews.rating' },
            0,
          ],
        },

        totalFrauds: { $size: '$frauds' },

        idStatus: '$identityVerificationStatus',

        status: {
          $cond: ['$isSuspended', 'Suspended', 'Active'],
        },

        isActive: {
          $cond: ['$isSuspended', false, true],
        },
      },
    },

    /** Final shape */
    {
      $project: {
        _id: 1,
        profile: 1,
        name: 1,
        email: 1,
        phone: 1,
        createdAt: 1,

        earnings: 1,
        totalListings: 1,
        totalOrders: 1,

        idStatus: 1,
        status: 1,

        identityVerificationStatus: 1,
        isSuspended: 1,
        isActive: 1,

        // reviews
        totalReviews: 1,
        averageRating: { $round: ['$averageRating', 1] },
        reviews: 1,

        // frauds
        totalFrauds: 1,
        frauds: 1,
      },
    },
  ]);

  if (!seller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Seller not found');
  }

  return seller;
};




const saveFcmToken = async ({ userId, fcmToken }) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { fcmToken },
    { new: true }
  );

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return {
    message: 'FCM token saved successfully',
  };
}



/**
 * Add a new address for a user
 * @param {String} userId
 * @param {Object} addressData
 * @returns {Promise<User>}
 */
const addAddress = async (userId, addressData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.addresses.push(addressData);
  await user.save();
  return user.addresses;
};

/**
 * Get all addresses of a user
 * @param {String} userId
 * @returns {Promise<Array>}
 */
const getAddresses = async (userId) => {
  const user = await User.findById(userId).select('addresses');
  if (!user) {
    throw new Error('User not found');
  }
  return user.addresses;
};

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}
const sendOtpToBuyerBeforeOrder = async (userId) => {
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Buyer not found');
  }

  try {
    // 🔹 SEND OTP FIRST (NO DB WRITE YET)
    if (user.primaryKey === 'email') {
      if (!user.email) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Buyer email not found');
      }
      await sendVerificationEmail(user.email, otp);

    } else if (user.primaryKey === 'phone') {
      if (!user.phone) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Buyer phone not found');
      }
      await sendOtpSms(user.phone, otp);

    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid primary key');
    }

    // 🔹 SAVE OTP ONLY AFTER SUCCESSFUL SEND
    user.orderOtp = otp;
    user.orderOtpExpiresAt = otpExpiry;
    await user.save();

    return {
      success: true,
      message: 'OTP sent successfully to buyer',
    };

  } catch (error) {
    // 🔴 HANDLE TWILIO / EMAIL ERRORS CLEANLY

    if (error.code === 21608) {
      // Twilio trial unverified number error
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Phone number is not verified. Please verify the number or use email OTP.'
      );
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to send OTP'
    );
  }
};


const verifyOtpBeforeOrder = async (payload) => {
  const { userId, otp } = payload;

  const user = await User.findById(userId);
  if (!user) {
    return {
      success: false,
      message: 'user not found',
    };
  }

  if (!user.orderOtp || !user.orderOtpExpiresAt) {
    return {
      success: false,
      message: 'OTP not generated or already used',
    };
  }

  if (user.orderOtpExpiresAt < new Date()) {
    return {
      success: false,
      message: 'OTP has expired',
    };
  }
  if (String(user.orderOtp) !== String(otp)) {
    return {
      success: false,
      message: 'Invalid OTP',
    };
  }



  user.orderOtp = null;
  user.orderOtpExpiresAt = null;
  await user.save();


  // // notification for buyer
  // await notificationService.createNotification({
  //   recipient: order.buyerId,
  //   title: 'Order Delivered',
  //   message: `Order Delivered! Your order #${order.orderNumber} has been delivered successfully.`,
  //   type: 'ORDER_DELIVERED',
  //   data: { orderId: order.id, role: 'BUYER' },
  // });

  // // notification for seller
  // await notificationService.createNotification({
  //   recipient: order.sellerId,
  //   title: 'Order Completed',
  //   message: `Order Completed! Order #${order.orderNumber} has been delivered.`,
  //   type: 'ORDER_COMPLETED',
  //   data: { orderId: order.id, role: 'SELLER' },
  // });

  return {
    success: true,
    message: 'OTP verified',
  };
};


/**
 * Block user
 * @param {ObjectId} userId
 * @param {ObjectId} targetUserId
 * @returns {Promise<User>}
 */
const blockUserById = async (userId, targetUserId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const targetUser = await getUserById(targetUserId);
  if (!targetUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Target user not found');
  }
  if (!user.blockedUsers.includes(targetUserId)) {
    user.blockedUsers.push(targetUserId);
    await user.save();
  }
  return user;
};

/**
 * Unblock user
 * @param {ObjectId} userId
 * @param {ObjectId} targetUserId
 * @returns {Promise<User>}
 */
const unblockUserById = async (userId, targetUserId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.blockedUsers.includes(targetUserId)) {
    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== targetUserId.toString());
    await user.save();
  }
  return user;
};

/**
 * Get blocked users by seller id
 * @param {ObjectId} sellerId
 * @returns {Promise<Array>}
 */
const getBlockedUsers = async (sellerId) => {
  const seller = await getUserById(sellerId);
  if (!seller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Seller not found');
  }

  const blockedUsers = await User.find({
    _id: { $in: seller.blockedUsers }
  }).select('name email phone profile');

  return blockedUsers;
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
  getMyTransactions,
  suspendUserById,
  reactivateUserById,
  getResetPasswordLink,
  getSellersList,
  getSellerDetails,
  saveFcmToken,
  addAddress,
  getAddresses,
  sendOtpToBuyerBeforeOrder,
  verifyOtpBeforeOrder,
  blockUserById,
  unblockUserById,
  getBlockedUsers,
};
