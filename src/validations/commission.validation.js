const Joi = require('joi');

const createCommission = {
  body: Joi.object().keys({
    taxPercentage: Joi.number().min(0).max(100),
    isPlatformChargesApplied: Joi.boolean(),
    platformCharges: Joi.number().min(0),
    isCommissionEnabled: Joi.boolean(),
    commissionPercentage: Joi.number().min(0).max(100),
    minimumOrderValue: Joi.number().min(0),
  }),
};

const getCommission = {
  query: Joi.object().keys({}),
};

module.exports = {
  createCommission,
  getCommission,
};
