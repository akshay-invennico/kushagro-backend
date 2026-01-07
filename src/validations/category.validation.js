const Joi = require('joi');

const fieldSchema = Joi.object({
  label: Joi.string().required(),
  key: Joi.string().required(),
  type: Joi.string().valid('TEXT', 'NUMBER', 'DROPDOWN', 'TEXTAREA').required(),
  options: Joi.array().items(Joi.string()),
  isRequired: Joi.boolean(),
  order: Joi.number(),
});

const createCategory = {
  body: Joi.object({
    name: Joi.string().required(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').required(),
    fields: Joi.array().items(fieldSchema),
  }),
};

const updateCategory = {
  body: Joi.object({
    name: Joi.string(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE'),
    fields: Joi.array().items(fieldSchema),
  }),
};

module.exports = {
  createCategory,
  updateCategory,
};
