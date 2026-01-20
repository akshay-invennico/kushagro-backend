const { Commission } = require('../models');

/**
 * Create or update commission
 * @param {Object} commissionBody
 * @returns {Promise<Commission>}
 */
const createCommission = async (commissionBody) => {
  const commission = await Commission.findOneAndUpdate({}, commissionBody, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  return commission;
};

/**
 * Get commission
 * @returns {Promise<Commission>}
 */
const getCommission = async () => {
  return Commission.findOne();
};

module.exports = {
  createCommission,
  getCommission,
};
