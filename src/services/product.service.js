const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { Product, User, Rating } = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');
const Commission = require('../models/commission.model');

/**
 * Create a product
 * @param {Object} productBody
 * @returns {Promise<Product>}
 */
const createProduct = async (productBody) => {
  const { name } = productBody;
  const product = await Product.findOne({ name });
  if (product) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product with this name already exists');
  }

  const newProduct = await Product.create(productBody);

  // notification for admin
  const admins = await User.find({ role: 'ADMIN' });
  for (const admin of admins) {
    await notificationService.createNotification({
      recipient: admin.id,
      title: 'New Listing Added',
      message: `New Listing Added! Seller ${newProduct.sellerId} added a new product ${newProduct.name}.`,
      type: 'PRODUCT_CREATED',
      data: { productId: newProduct.id, role: 'ADMIN' },
    });
  }

  return newProduct;
};

const queryProducts = async (filter, options) => {
  const limit = options.limit ? parseInt(options.limit, 10) : 10;
  const page = options.page ? parseInt(options.page, 10) : 1;
  const skip = (page - 1) * limit;

  const matchStage = {};

  if (filter.name) {
    matchStage.name = { $regex: filter.name, $options: 'i' };
  }
  if (filter.status) {
    matchStage.status = filter.status;
  }
  if (filter.categoryId) {
    matchStage.categoryId = new mongoose.Types.ObjectId(filter.categoryId);
  }
  if (filter.sellerId) {
    matchStage.sellerId = new mongoose.Types.ObjectId(filter.sellerId);
  }
  if (filter.price) {
    matchStage.price = filter.price;
  }


  if (options.buyerId) {
    const blockedSellers = await User.find({ blockedUsers: options.buyerId }).select('_id');
    const blockedSellerIds = blockedSellers.map((user) => user._id);

    if (blockedSellerIds.length > 0) {
      if (matchStage.sellerId) {
        const isBlocked = blockedSellerIds.some((id) => id.equals(matchStage.sellerId));
        if (isBlocked) {
          matchStage._id = new mongoose.Types.ObjectId();
          return {
            results: [],
            page: options.page || 1,
            limit: options.limit || 10,
            totalPages: 0,
            totalResults: 0,
          };
        }
      } else {
        matchStage.sellerId = { $nin: blockedSellerIds };
      }
    }
  }

  if (filter.lat && filter.long) {
    const lat = parseFloat(filter.lat);
    const lng = parseFloat(filter.long);
    const radiusInDegrees = 0.5; // Roughly 50km

    matchStage['location.lat'] = { $gte: lat - radiusInDegrees, $lte: lat + radiusInDegrees };
    matchStage['location.lng'] = { $gte: lng - radiusInDegrees, $lte: lng + radiusInDegrees };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller',
      },
    },
    { $unwind: '$seller' },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'ratings',
        localField: 'sellerId',
        foreignField: 'sellerId',
        as: 'sellerRatings',
      },
    },
    {
      $addFields: {
        sellerReviews: {
          totalReviews: { $size: '$sellerRatings' },
          averageRating: {
            $cond: [{ $eq: [{ $size: '$sellerRatings' }, 0] }, 0, { $avg: '$sellerRatings.rating' }],
          },
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        price: 1,
        images: 1,
        location: 1,
        status: 1,
        extraFields: 1,
        createdAt: 1,
        updatedAt: 1,
        category: { _id: 1, name: 1, slug: 1 },
        sellerId: {
          _id: '$seller._id',
          name: '$seller.name',
          email: '$seller.email',
          phone: '$seller.phone',
          profile: '$seller.profile',
          bio: '$seller.bio',
          identityVerificationStatus: '$seller.identityVerificationStatus',
          totalReviews: '$sellerReviews.totalReviews',
          averageRating: '$sellerReviews.averageRating',
        },
      },
    },
  ];

  let sortStage = { createdAt: -1 };
  if (options.sortBy) {
    if (options.sortBy === 'newest') {
      sortStage = { createdAt: -1 };
    } else if (options.sortBy === 'trending') {
      sortStage = { createdAt: -1 };
    } else {
      const [key, order] = options.sortBy.split(':');
      if (key && order) {
        sortStage = { [key]: order === 'desc' ? -1 : 1 };
      }
    }
  } else if (options.priceOrder) {
    if (options.priceOrder === 'highToLow') sortStage = { price: -1 };
    if (options.priceOrder === 'lowToHigh') sortStage = { price: 1 };
  }

  pipeline.push({ $sort: sortStage });

  const facetStage = {
    $facet: {
      metadata: [{ $count: 'total' }, { $addFields: { page } }],
      data: [{ $skip: skip }, { $limit: limit }],
    },
  };
  pipeline.push(facetStage);

  const result = await Product.aggregate(pipeline);

  const metadata = result[0].metadata[0] || { total: 0, page: 1 };
  const products = result[0].data;

  return {
    results: products,
    page: metadata.page,
    limit,
    totalPages: Math.ceil(metadata.total / limit),
    totalResults: metadata.total,
  };
};

/**
 * Get product by id
 * @param {ObjectId} id
 * @returns {Promise<Product>}
 */
const getProductById = async (id) => {
  const product = await Product.findById(id)
    .populate('sellerId', 'name email profile bio identityVerificationStatus phone')
    .populate('categoryId', 'name slug')
    .lean();

  if (!product) {
    return null;
  }

  const ratingsStats = await Rating.aggregate([
    { $match: { sellerId: product.sellerId._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const sellerReviews = ratingsStats.length > 0 ? ratingsStats[0] : { averageRating: 0, totalReviews: 0 };

  if (product.sellerId) {
    product.sellerId.averageRating = sellerReviews.averageRating;
    product.sellerId.totalReviews = sellerReviews.totalReviews;
  }

  const commission = (await Commission.findOne().sort({ createdAt: -1 }).lean()) || {
    taxPercentage: 0,
    isPlatformChargesApplied: false,
    platformCharges: 0,
    isCommissionEnabled: false,
    commissionPercentage: 0,
    minimumOrderValue: 0,
  };

  const basePrice = Number(product.price || 0);
  const taxAmount = commission.taxPercentage > 0 ? (basePrice * commission.taxPercentage) / 100 : 0;
  const platformChargeAmount = commission.isPlatformChargesApplied ? Number(commission.platformCharges || 0) : 0;

  const commissionAmount =
    commission.isCommissionEnabled && basePrice >= commission.minimumOrderValue
      ? (basePrice * commission.commissionPercentage) / 100
      : 0;

  const totalAmount = Number((basePrice + taxAmount + platformChargeAmount + commissionAmount).toFixed(2));

  return {
    ...product,

    pricing: {
      basePrice,
      tax: {
        percentage: commission.taxPercentage,
        amount: Number(taxAmount.toFixed(2)),
      },
      platformCharges: {
        applied: commission.isPlatformChargesApplied,
        amount: platformChargeAmount,
      },
      commission: {
        enabled: commission.isCommissionEnabled,
        percentage: commission.commissionPercentage,
        amount: Number(commissionAmount.toFixed(2)),
      },
      totalAmount,
    },
  };
};

/**
 * Get product by seller id
 * @param {ObjectId} sellerId
 * @returns {Promise<Product>}
 */
const getProductBySellerId = async (sellerId) => {
  return queryProducts({ sellerId }, {});
};

/**
 * Update product by id
 * @param {ObjectId} productId
 * @param {Object} updateBody
 * @returns {Promise<Product>}
 */
const updateProductById = async (productId, updateBody) => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: updateBody },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('sellerId', 'name email')
    .populate('categoryId', 'name slug');

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

/**
 * Delete product by id
 * @param {ObjectId} productId
 * @returns {Promise<Product>}
 */
const deleteProductById = async (productId) => {
  const product = await Product.findByIdAndDelete(productId);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return product;
};

module.exports = {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  getProductBySellerId,
};
