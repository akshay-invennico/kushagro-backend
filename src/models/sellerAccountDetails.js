const mongoose = require('mongoose');
const validator = require('validator');

const SellerAccountSchema = mongoose.Schema(
  {
    seller_Id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    country: {
      type: String,
      required: true,
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
    subaccount_code: {
      type: String,
      required: true,
      unique: true,
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

module.exports = mongoose.model('SellerAccountDetails', SellerAccountSchema);
