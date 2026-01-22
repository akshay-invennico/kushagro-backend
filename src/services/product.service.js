const httpStatus = require('http-status');
const { Product, User } = require('../models');
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

  let sort = { createdAt: -1 };
  if (options.priceOrder === 'highToLow') {
    sort = { price: -1 };
  }

  if (options.priceOrder === 'lowToHigh') {
    sort = { price: 1 };
  }

  if (!options.priceOrder && options.sortBy) {
    sort = {};
    options.sortBy.split(',').forEach((sortOption) => {
      const [key, order] = sortOption.split(':');
      sort[key] = order === 'desc' ? -1 : 1;
    });
  }

  const [totalResults, results] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'sellerId',
        select: '_id name profile email phone',
      })
      .populate({
        path: 'categoryId',
        select: '_id name slug',
      })
      .lean(),
  ]);

  const totalPages = Math.ceil(totalResults / limit);

  return {
    results,
    page,
    limit,
    totalPages,
    totalResults,
  };
};

/**
 * Get product by id
 * @param {ObjectId} id
 * @returns {Promise<Product>}
 */
const getProductById = async (id) => {
  const product = await Product.findById(id).populate('sellerId', 'name email').populate('categoryId', 'name slug').lean();

  if (!product) {
    return null;
  }

  // 🔹 Fetch commission or fallback to defaults
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
  return Product.find(sellerId);
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
