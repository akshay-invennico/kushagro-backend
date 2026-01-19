const Joi = require('joi');

exports.createRating = {
  body: Joi.object().keys({
    sellerId: Joi.string().required(),
    orderId: Joi.string().optional(),
    rating: Joi.number().min(1).max(5).required(),
    review: Joi.string().allow(''),
  }),
};
