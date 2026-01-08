const Payment = require('../models/payment.model');

const processWebhook = async (payload) => {
  const { event, data } = payload;
  if (!data) return;

  const reference = data.reference || data.transaction_reference || data.trxref;
  if (!reference) return;

  if (event === 'charge.success') {
    await Payment.findOneAndUpdate({ reference, type: 'PayIn' }, { $set: { status: 'Payment success' } });
  }

  if (event === 'charge.failed') {
    await Payment.findOneAndUpdate({ reference, type: 'PayIn' }, { $set: { status: 'Payment failed' } });
  }

  if (event === 'transfer.success') {
    await Payment.findOneAndUpdate({ reference, type: 'Payout' }, { $set: { status: 'Payout success' } });
  }

  if (event === 'transfer.failed') {
    await Payment.findOneAndUpdate({ reference, type: 'Payout' }, { $set: { status: 'Payout failed' } });
  }

  if (event === 'refund.pending') {
    await Payment.findOneAndUpdate({ reference, type: 'Refund' }, { $set: { status: 'Refund pending' } });
  }

  if (event === 'refund.processed') {
    await Payment.findOneAndUpdate({ reference, type: 'Refund' }, { $set: { status: 'Refunded' } });
  }

  if (event === 'refund.failed') {
    await Payment.findOneAndUpdate({ reference, type: 'Refund' }, { $set: { status: 'Refund failed' } });
  }
};

module.exports = { processWebhook };
