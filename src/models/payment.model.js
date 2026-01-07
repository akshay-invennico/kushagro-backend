const mongoose = require('mongoose');

const { Types } = mongoose;

const paymentSchema = mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    order_Id: {
      type: Types.ObjectId,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    buyer_Id: {
      type: Types.ObjectId,
      required: true,
    },
    seller_Id: {
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
