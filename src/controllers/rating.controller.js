const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const ratingService = require('../services/rating.service');

const createRating = catchAsync(async (req, res) => {
  const rating = await ratingService.createRating(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: rating,
  });
});

const getRatings = catchAsync(async (req, res) => {
  const filter = {};
  filter.isDeleted = false;

  const options = pick(req.query, ['limit', 'page', 'sortBy']);

  if (req.user.role === 'ADMIN') {
  }

  if (req.user.role === 'BUYER') {
    filter.buyerId = req.user.id;
  }

  if (req.user.role === 'SELLER') {
    filter.sellerId = req.user.id;
  }

  const result = await ratingService.queryRatings(filter, options);

  res.json({
    success: true,
    data: result,
  });
});

const deleteRating = catchAsync(async (req, res) => {
  await ratingService.deleteRating(req.params.ratingId);

  res.json({
    success: true,
    message: 'Rating deleted successfully',
  });
});

const getSellerRatingsById = catchAsync(async (req, res) => {
  const { sellerId } = req.params;

  const filter = {
    sellerId: sellerId,
    isDeleted: false,
  };

  const options = pick(req.query, ['limit', 'page', 'sortBy']);

  const ratings = await ratingService.queryRatings(filter, options);
  const stats = await ratingService.getSellerRatingStats(sellerId);

  res.json({
    success: true,
    data: {
      stats: {
        averageRating: Number(stats.averageRating?.toFixed(1)) || 0,
        totalReviews: stats.totalReviews || 0,
      },
      reviews: ratings,
    },
  });
});


module.exports = {
  createRating,
  getRatings,
  deleteRating,
  getSellerRatingsById
};
