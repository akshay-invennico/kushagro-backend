const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');

const createProduct = catchAsync(async (req, res) => {
  if (req.user.role !== 'SELLER' && req.user.role !== 'ADMIN') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only sellers can create products');
  }

  const productBody = { ...req.body, sellerId: req.user.id };
  const product = await productService.createProduct(productBody);

  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Product created successfully',
    data: product,
    meta: null,
    error: null,
  });
});

const getProducts = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'categoryId', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const { role } = req.user;
  const userId = req.user._id;

  if (role === 'SELLER') {
    filter.sellerId = userId;
  }

  if (role === 'BUYER') {
    filter.status = 'ACTIVE';
  }

  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }

  const result = await productService.queryProducts(filter, options);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Products fetched successfully',
    data: result.results,
    meta: {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    },
    error: null,
  });
});

const getProduct = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.productId);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Product fetched successfully',
    data: product,
    meta: null,
    error: null,
  });
});

const getProductsBySellerId = catchAsync(async (req, res) => {
  const sellerId = req.params;
  const products = await productService.getProductBySellerId(sellerId);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Seller products fetched successfully',
    data: products,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.productId);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SELLER') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only sellers or admins can update products');
  }

  const updatedProduct = await productService.updateProductById(req.params.productId, req.body);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct,
    meta: null,
    error: null,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  await productService.deleteProductById(req.params.productId);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Product deleted successfully',
    data: null,
    meta: null,
    error: null,
  });
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsBySellerId,
};
