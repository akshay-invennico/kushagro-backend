const httpStatus = require('http-status');
const mongoose = require('mongoose');
const Rating = require('../models/rating.model');
const ApiError = require('../utils/ApiError');

const createRating = async (buyerId, body) => {
  if (buyerId === body.sellerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot rate yourself');
  }

  const existingRating = await Rating.findOne({
    buyerId,
    sellerId: body.sellerId,
    orderId: body.orderId,
    isDeleted: false,
  });

  if (existingRating) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already rated this seller for this order');
  }

  return Rating.create({
    buyerId,
    sellerId: body.sellerId,
    orderId: body.orderId,
    rating: body.rating,
    review: body.review,
  });
};

const queryRatings = async (filter, options) => {
  const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = (page - 1) * limit;

  let sort = {};
  if (options.sortBy) {
    const sortingCriteria = [];
    options.sortBy.split(',').forEach((sortOption) => {
      const [key, order] = sortOption.split(':');
      sortingCriteria.push((order === 'desc' ? '-' : '') + key);
    });
    sort = sortingCriteria.join(' ');
  } else {
    sort = '-createdAt';
  }

  const totalResults = await Rating.countDocuments(filter);

  const results = await Rating.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'buyerId',
      select: 'name email phone profile',
    })
    .exec();

  const totalPages = Math.ceil(totalResults / limit);

  return {
    results,
    meta: {
      page,
      limit,
      totalPages,
      totalResults,
    },
  };
};

const deleteRating = async (ratingId) => {
  const rating = await Rating.findById(ratingId);
  if (!rating) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Rating not found');
  }

  rating.isDeleted = true;
  await rating.save();
};

const getSellerRatingStats = async (sellerId) => {
  const stats = await Rating.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$sellerId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return stats[0] || { averageRating: 0, totalReviews: 0 };
};

module.exports = {
  createRating,
  queryRatings,
  deleteRating,
  getSellerRatingStats,
};
