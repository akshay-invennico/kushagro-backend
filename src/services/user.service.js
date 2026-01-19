const httpStatus = require('http-status');
const { User, Report } = require('../models');
const ApiError = require('../utils/ApiError');
const Payment = require('../models/payment.model');

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
  const users = await User.paginate(filter, options);
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
  getMyTransactions
};
