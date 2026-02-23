const payment = require('../config/payment');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const SellerAccountDetails = require('../models/sellerAccountDetails');
const config = require('../config/config');

const createSellerBankAccount = async (payload) => {
  const {
    sellerId,
    country,
    bankCode,
    accountNumber,
    firstName,
    lastName,
    fullName,
    bankName,
    phone,
    email,
    currency,
  } = payload;

  const existing = await SellerAccountDetails.findOne({ sellerId });
  if (existing) {
    throw new Error('Bank account already exists for this seller');
  }

  const accountName = firstName && lastName ? `${firstName} ${lastName}` : fullName;

  if (!accountName) {
    throw new Error('Account holder name is required');
  }

  let recipientRes;
  try {
    recipientRes = await payment.post('/beneficiaries', {
      account_number: accountNumber,
      account_bank: bankCode,
      name: accountName,
      currency,
      email,
      phone_number: phone,
      meta: {
        sellerId: sellerId.toString(),
        country,
      },
    });
  } catch (err) {
    let errorMessage = 'Failed to create beneficiary';

    if (err && err.response && err.response.data && err.response.data.message) {
      errorMessage = err.response.data.message;
    }

    throw new Error(errorMessage);
  }

  const last4 = accountNumber.slice(-4);

  return SellerAccountDetails.create({
    sellerId,
    country,
    currency,
    email,
    phone,
    bankCode,
    bank_name: bankName,
    account_holder_firstname: firstName,
    account_holder_lastname: lastName,
    account_holder_fullname: fullName,
    accountNumber: last4,
    fullAccountNumber: accountNumber,
    recipient_code: recipientRes.data.data.id.toString(),
    status: true,
  });
};

const paySeller = async (payload) => {
  const { sellerId, orderId } = payload;

  const sellerAccount = await SellerAccountDetails.findOne({
    sellerId,
    status: true,
  });

  if (!sellerAccount || !sellerAccount.recipient_code) {
    throw new Error('Seller Flutterwave beneficiary not found');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const { buyerId } = order;

  if (order.status !== 'COMPLETE') {
    throw new Error('Order must be COMPLETED before payout');
  }

  const existingPayout = await Payment.findOne({
    orderId,
    sellerId,
    type: 'Payout',
    status: { $in: ['Pending', 'Payout success'] },
  });

  if (existingPayout) {
    if (existingPayout.status === 'Pending') {
      throw new Error('Payout already pending');
    }
    throw new Error('Payout already completed');
  }

  const sellerAmount = Number(order.paybleAmount) - Number(order.platformCharges);

  if (sellerAmount <= 0) {
    throw new Error('Invalid seller payout amount');
  }

  const currency = sellerAccount.currency || 'NGN';

  const balanceResponse = await payment.get('/balances');

  if (!balanceResponse || !balanceResponse.data || balanceResponse.data.status !== 'success') {
    throw new Error('Unable to fetch Flutterwave balance');
  }

  const balances = balanceResponse.data.data || [];

  const currencyBalance = balances.find(function (b) {
    return b.currency === currency;
  });

  if (!currencyBalance) {
    throw new Error(`No ${currency} balance found in Flutterwave account`);
  }

  const availableBalance = Number(currencyBalance.available_balance);

  if (availableBalance < sellerAmount) {
    throw new Error(`Insufficient ${currency} balance. Available: ${availableBalance}, Required: ${sellerAmount}`);
  }

  const transferPayload = {
    amount: sellerAmount,
    currency,
    beneficiary: Number(sellerAccount.recipient_code),
    narration: `Seller payout for order ${order.orderNumber}`,
    reference: `PAYOUT_${orderId}_${Date.now()}`,
    callback_url: config.payment.flutterwaveWebhokUrl,
  };

  let response;
  try {
    response = await payment.post('/transfers', transferPayload);
  } catch (err) {
    let fwError = null;
    if (err && err.response && err.response.data) {
      fwError = err.response.data;
    }
    throw new Error((fwError && fwError.message) || 'Flutterwave transfer failed');
  }

  await Payment.create({
    orderId,
    sellerId,
    buyerId,
    type: 'Payout',
    amount: sellerAmount.toString(),
    reference: response.data.data.reference,
    transactionId: response.data.data.id,
    status: 'Pending',
    currency,
    date: new Date().toISOString(),
  });

  return response.data.data;
};

const refundBuyer = async (payload) => {
  const { orderId } = payload;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const buyerPayment = await Payment.findOne({
    orderId,
    type: 'PayIn',
    status: 'Payment success',
  });

  if (!buyerPayment) {
    throw new Error('No successful payment found for this order');
  }

  const existingRefund = await Payment.findOne({
    orderId,
    type: 'Refund',
  });

  if (existingRefund) {
    throw new Error('Refund already initiated');
  }

  let transactionId = null;

  if (buyerPayment.authorization_Id && buyerPayment.authorization_Id.transactionId) {
    transactionId = buyerPayment.authorization_Id.transactionId;
  } else if (buyerPayment.reference) {
    transactionId = buyerPayment.reference;
  }

  if (!transactionId) {
    throw new Error('Transaction ID missing');
  }

  const refundPayload = {
    amount: order.paybleAmount,
    comments: `Refund for order ${order.orderNumber}`,
  };

  const response = await payment.post(`/transactions/${transactionId}/refund`, refundPayload);

  await Payment.create({
    orderId,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    type: 'Refund',
    amount: order.paybleAmount.toString(),
    reference: transactionId,
    originalReference: buyerPayment.reference,
    status: 'Refund initiated',
    refund_reason: refundPayload.comments,
    date: new Date().toISOString(),
    currency: buyerPayment.currency || 'UGX',
  });

  return response.data.data;
};

const getBankDetails = async (payload) => {
  const { country } = payload.query;

  const response = await payment.get(`/banks/${country}`);

  if (response.data.status !== 'success') {
    throw new Error('Failed to fetch bank details');
  }

  return response.data.data.map((bank) => ({
    name: bank.name,
    code: bank.code,
  }));
};

module.exports = {
  createSellerBankAccount,
  paySeller,
  refundBuyer,
  getBankDetails,
};
