const Joi = require('joi');

exports.createTicket = {
  body: Joi.object().keys({
    topic: Joi.string().required(),
    description: Joi.string().allow(''),
  }),
};
