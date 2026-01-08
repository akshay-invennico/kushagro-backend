const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    price: Joi.number().required().min(0),
    categoryId: Joi.string().custom(objectId).required(),
    sellerId: Joi.string().custom(objectId).required(),
    images: Joi.array().items(Joi.string()).max(5),
    location: Joi.object().keys({
      address: Joi.string(),
      lat: Joi.number(),
      lng: Joi.number(),
    }),
    extraFields: Joi.object(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE'),
  }),
};

const getProducts = {
  query: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    categoryId: Joi.string().custom(objectId),
    sellerId: Joi.string().custom(objectId),
    minPrice: Joi.number(),
    maxPrice: Joi.number(),
    status: Joi.string(),
  }),
};

const getProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string().allow(''),
      price: Joi.number().min(0),
      categoryId: Joi.string().custom(objectId),
      sellerId: Joi.string().custom(objectId),
      images: Joi.array().items(Joi.string()).max(5),
      location: Joi.object().keys({
        address: Joi.string(),
        lat: Joi.number(),
        lng: Joi.number(),
      }),
      extraFields: Joi.object(),
      status: Joi.string().valid('ACTIVE', 'INACTIVE'),
    })
    .min(1),
};

const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
