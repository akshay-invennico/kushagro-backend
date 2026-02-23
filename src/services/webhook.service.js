const flutterwaveApi = require('../config/payment');
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');

/**
 * Handle payment (PayIn) success/failure
 */
const handleChargeCompleted = async (data) => {
  const reference = data.txRef;

  const paymentRecord = await Payment.findOne({
    reference,
    type: 'PayIn',
  });

  if (!paymentRecord || paymentRecord.status === 'Payment success') {
    return;
  }

  let verifiedData = data;

  if (data.id) {
    try {
      const verifyResponse = await flutterwaveApi.get(`/transactions/${data.id}/verify`);
      verifiedData = verifyResponse.data.data;
    } catch (_) {
      verifiedData = data;
    }
  }

  if (verifiedData.status === 'successful') {
    paymentRecord.status = 'Payment success';
    paymentRecord.authorization_Id = {
      transactionId: verifiedData.id,
      flw_ref: verifiedData.flw_ref,
      customer: verifiedData.customer,
      amount_settled: verifiedData.amount_settled,
      app_fee: verifiedData.app_fee,
    };
  } else {
    paymentRecord.status = 'Payment failed';
  }

  await paymentRecord.save();

  if (paymentRecord.status === 'Payment success' && paymentRecord.orderId) {
    const order = await Order.findById(paymentRecord.orderId);
    if (order && order.status !== 'PAID') {
      order.status = 'PAID';
      await order.save();
    }
  }
};

/**
 * Handle payout success
 */
const handleTransferCompleted = async (data) => {
  const transferId = data.id;
  if (!transferId) return;

  const paymentRecord = await Payment.findOne({
    transactionId: transferId,
    type: 'Payout',
  });

  if (!paymentRecord || paymentRecord.status === 'Payout success') {
    return;
  }

  paymentRecord.status = 'Payout success';
  await paymentRecord.save();
};

/**
 * Handle payout failure
 */
const handleTransferFailed = async (data) => {
  const transferId = data.id;
  if (!transferId) return;

  const paymentRecord = await Payment.findOne({
    transactionId: transferId,
    type: 'Payout',
  });

  if (!paymentRecord) return;

  paymentRecord.status = 'Payout failed';
  paymentRecord.failureReason = data.complete_message || 'Transfer failed';

  await paymentRecord.save();
};

/**
 * Handle refund success
 */
const handleRefundCompleted = async (data) => {
  const reference = data.txRef;

  const paymentRecord = await Payment.findOne({
    reference,
    type: 'Refund',
  });

  if (!paymentRecord || paymentRecord.status === 'Refund completed') {
    return;
  }

  paymentRecord.status = 'Refund completed';
  await paymentRecord.save();

  if (paymentRecord.orderId) {
    const order = await Order.findById(paymentRecord.orderId);
    if (order) {
      order.status = 'CANCELLED';
      await order.save();
    }
  }
};

/**
 * Handle refund failure
 */
const handleRefundFailed = async (data) => {
  const reference = data.txRef;

  const paymentRecord = await Payment.findOne({
    reference,
    type: 'Refund',
  });

  if (!paymentRecord) return;

  paymentRecord.status = 'Refund failed';
  await paymentRecord.save();
};

/**
 * Main Flutterwave webhook processor
 */
const processpaymentWebhook = async (payload) => {
  const parsedPayload = Buffer.isBuffer(payload) ? JSON.parse(payload.toString('utf8')) : payload;

  const event = parsedPayload.event || parsedPayload.type || 'charge.completed';

  const data = parsedPayload.data || parsedPayload;
  if (!data) return;

  switch (event) {
    case 'charge.completed':
      await handleChargeCompleted(data);
      break;

    case 'transfer.completed':
      await handleTransferCompleted(data);
      break;

    case 'transfer.failed':
      await handleTransferFailed(data);
      break;

    case 'refund.completed':
      await handleRefundCompleted(data);
      break;

    case 'refund.failed':
      await handleRefundFailed(data);
      break;

    default:
      break;
  }
};

module.exports = {
  processpaymentWebhook,
};
