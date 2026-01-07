const Payment = require('../models/payment.model');

const processWebhook = async (payload) => {
  const { event, data } = payload;
  const { reference } = data;

  if (event === 'transfer.failed') {
    await Payment.findOneAndUpdate({ reference, type: 'Payout' }, { $set: { status: 'Payout failed' } });
  }

  if (event === 'refund.pending') {
    await Payment.findOneAndUpdate({ reference, type: 'Refund' }, { $set: { status: 'Refund pending' } });
  }

  if (event === 'refund.success') {
    await Payment.findOneAndUpdate({ reference, type: 'Refund' }, { $set: { status: 'Refunded' } });
  }

  if (event === 'refund.failed') {
    await Payment.findOneAndUpdate({ reference, type: 'Refund' }, { $set: { status: 'Refund failed' } });
  }
};

module.exports = { processWebhook };
