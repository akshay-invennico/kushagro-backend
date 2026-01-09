const mongoose = require('mongoose');

const { Types } = mongoose;

const paymentSchema = mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    orderId: {
      type: Types.ObjectId,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    buyerId: {
      type: Types.ObjectId,
      required: true,
    },
    sellerId: {
      type: Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    authorization_Id: {
      type: Object,
    },
    adminCommission: {
      type: String,
    },
    refund_reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
