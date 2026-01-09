const Joi = require('joi');
const { objectId } = require('./custom.validation');

/**
 * INITIALIZE PAYMENT
 */
const initializePayment = {
  body: Joi.object({
    email: Joi.string().email().required(),
    orderId: Joi.string().custom(objectId).required(),
    buyerId: Joi.string().custom(objectId).required(),
    sellerId: Joi.string().custom(objectId).required(),
  }),
};

/**
 * CREATE SELLER BANK ACCOUNT
 */
const createSellerBankAccount = {
  body: Joi.object({
    sellerId: Joi.string().custom(objectId).required(),

    country: Joi.string().valid('NG', 'ZA').required(),
    bankCode: Joi.string().trim().required(),
    bankName: Joi.string().trim().required(),

    accountNumber: Joi.string()
      .pattern(/^\d{6,20}$/)
      .required(),

    firstName: Joi.string().trim().when('country', {
      is: 'NG',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    lastName: Joi.string().trim().when('country', {
      is: 'NG',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    // Non-NG
    fullName: Joi.string()
      .trim()
      .when('country', {
        is: Joi.not('NG'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),

    phone: Joi.string().trim().required(),
    email: Joi.string().email().required(),
  }),
};

/**
 * PAY SELLER
 */
const paySeller = {
  body: Joi.object({
    sellerId: Joi.string().custom(objectId).required(),
    orderId: Joi.string().custom(objectId).required(),
  }),
};

/**
 * REFUND BUYER
 */
const refundBuyer = {
  body: Joi.object({
    orderId: Joi.string().custom(objectId).required(),
    reference: Joi.string().trim().required(),

    buyerId: Joi.string().custom(objectId).required(),
    sellerId: Joi.string().custom(objectId).required(),

    reason: Joi.string().trim().allow('', null),
  }),
};

module.exports = {
  initializePayment,
  createSellerBankAccount,
  paySeller,
  refundBuyer,
};
