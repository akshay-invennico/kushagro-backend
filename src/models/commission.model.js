const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const commissionSchema = mongoose.Schema(
  {
    taxPercentage: {
      type: Number,
      required: true,
      default: 0,
    },
    isPlatformChargesApplied: {
      type: Boolean,
      default: false,
    },
    platformCharges: {
      type: Number,
      default: 0,
    },
    isCommissionEnabled: {
      type: Boolean,
      default: false,
    },
    commissionPercentage: {
      type: Number,
      default: 0,
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

commissionSchema.plugin(toJSON);

/**
 * @typedef Commission
 */
const Commission = mongoose.model('Commission', commissionSchema);

module.exports = Commission;
