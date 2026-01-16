const mongoose = require('mongoose');
const validator = require('validator');

const SellerAccountSchema = mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    country: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ['NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'XAF', 'XOF', 'ZMW', 'RWF', 'USD', 'EUR', 'GBP'],
      default: 'UGX',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      validate(value) {
        if (value && !validator.isEmail(value)) {
          throw new Error('Invalid email address');
        }
      },
    },
    phone: {
      type: String,
      sparse: true,
      trim: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    bank_name: {
      type: String,
      required: true,
    },
    account_holder_firstname: {
      type: String,
    },
    account_holder_lastname: {
      type: String,
    },
    account_holder_fullname: {
      type: String,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    fullAccountNumber: {
      type: String,
      required: true,
    },
    recipient_code: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const SellerAccountDetails = mongoose.model('SellerAccountDetails', SellerAccountSchema);
module.exports = SellerAccountDetails;
