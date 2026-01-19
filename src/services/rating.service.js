const httpStatus = require('http-status');
const mongoose = require('mongoose');
const Rating = require('../models/rating.model');
const ApiError = require('../utils/ApiError');

const createRating = async (buyerId, body) => {
  if (buyerId === body.sellerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot rate yourself');
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
  return Rating.paginate(filter, options);
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
