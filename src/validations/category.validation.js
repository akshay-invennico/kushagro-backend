const Joi = require('joi');
const { objectId } = require('./custom.validation');

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
    tax: Joi.number().required(),
    fields: Joi.array().items(fieldSchema),
  }),
};

const updateCategory = {
  body: Joi.object({
    name: Joi.string(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE'),
    tax: Joi.number(),
    fields: Joi.array().items(fieldSchema),
  }),
};

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory: {
    params: Joi.object().keys({
      categoryId: Joi.string().custom(objectId),
    }),
  },
  updateCategoryStatus: {
    params: Joi.object().keys({
      categoryId: Joi.string().custom(objectId),
    }),
    body: Joi.object().keys({
      status: Joi.string().valid('ACTIVE', 'INACTIVE').required(),
    }),
  },
};
