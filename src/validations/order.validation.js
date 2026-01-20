const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrder = {
  body: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
    buyerId: Joi.string().custom(objectId).required(),
  }),
};

const getOrderById = {
  params: Joi.object().keys({
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
    cancellationReason: Joi.string().optional().allow(null, ''),

    note: Joi.string().optional().allow(null, ''),
  }),
};

module.exports = {
  createOrder,
  getOrderById,
  updateOrder,
  sendOtpToBuyer,
  verifyOtpUpdateOrder,
  cancelOrder,
};
