const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrder = {
  body: Joi.object().keys({
    quantity: Joi.number().required().min(0),
    productId: Joi.string().custom(objectId).required(),
    buyerId: Joi.string().custom(objectId).required(),
    unit: Joi.string().required(),
    note: Joi.string().required(),
    price: Joi.string().required(),
  }),
};

const getAllOrders = {
  query: Joi.object({
    status: Joi.string().valid('ongoing', 'completed').required(),
  }),
};

const getOrderById = {
  query: Joi.object({
    orderId: Joi.string().custom(objectId).required(),
  }),
};

const updateOrder = {
  body: Joi.object({
    orderIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
  }),
};

const sendOtpToBuyer = {
  body: Joi.object({
    orderId: Joi.string().custom(objectId).required(),
  }),
};

const verifyOtpUpdateOrder = {
  body: Joi.object({
    orderId: Joi.string().custom(objectId).required(),
    otp: Joi.number().integer().min(1000).max(9999).required(),
  }),
};

const cancelOrder = {
  body: Joi.object({
    orderId: Joi.string().custom(objectId).required(),
    cancellationReason: Joi.string().required(),
    note: Joi.string().required(),
  }),
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  sendOtpToBuyer,
  verifyOtpUpdateOrder,
  cancelOrder,
};
