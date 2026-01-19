const mongoose = require('mongoose');

const { Types } = mongoose;

const paymentSchema = mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['PayIn', 'Payout', 'Refund'],
    },
    orderId: {
      type: Types.ObjectId,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      index: true,
    },
    originalReference: {
      type: String,
      index: true,
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
      enum: [
        'Pending',
        'Payment success',
        'Payment failed',
        'Payout success',
        'Payout failed',
        'Refund initiated',
        'Refund completed',
        'Refund failed',
      ],
      index: true, // Added index for status queries
    },
    amount: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'UGX',
    },
    originalCurrency: {
      type: String,
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
    failureReason: {
      type: String,
    },
    exchangeRate: {
      type: Number,
    },
    convertedAmount: {
      type: Number,
    },
    transactionId: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ reference: 1, type: 1 });
paymentSchema.index({ orderId: 1, type: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
