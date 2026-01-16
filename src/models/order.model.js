const mongoose = require('mongoose');

const { Types } = mongoose;

const orderSchema = mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
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
      enum: ['PENDING', 'PAID', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING',
      required: true,
    },
    OTP: {
      type: Number,
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
    },
    sellerId: {
      type: Types.ObjectId,
      required: true,
    },
    productId: {
      type: Types.ObjectId,
      required: true,
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
