const mongoose = require('mongoose');

const { Types } = mongoose;

const flagSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      required: true,
    },
    note: {
      type: String,
    },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED'],
      default: 'OPEN',
    },
    flaggedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const orderSchema = mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    quantity: {
      type: Number,
    },
    unit: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    subTotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    platformCharges: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paybleAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['ONGOING', 'PAID', 'CANCELLED', 'COMPLETE'],
      default: 'ONGOING',
      required: true,
    },
    OTP: {
      type: Number,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    otpSent: {
      type: Boolean,
      default: false,
    },
    otpExpiresAt: {
      type: Date,
    },
    note: {
      type: String,
    },

    buyerId: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },
    sellerId: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },
   buyerAddress: {
  type:String
},

    productId: {
      type: Types.ObjectId,
      required: true,
      ref: 'Product',
    },
    deliveryDate: {
      type: Date,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flag: {
      type: flagSchema,
      default: null,
    },

    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
