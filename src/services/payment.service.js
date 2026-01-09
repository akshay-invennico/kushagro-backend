const paystack = require('../config/payStack');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const SellerAccountDetails = require('../models/sellerAccountDetails');

const testPaystackConnection = async () => {
  await paystack.get('/bank');
  return true;
};

const initializePayment = async (payload) => {
  if (!payload) {
    throw new Error('Payload is required');
  }

  const { email, orderId, buyerId, sellerId } = payload;
  const orderDetails = await Order.findById(orderId);
  if (!orderDetails) {
    throw new Error('Order not found');
  }

  const existingPayment = await Payment.findOne({
    orderId,
    status: { $in: ['Pending', 'Payment success'] },
  });

  if (existingPayment) {
    throw new Error(
      existingPayment.status === 'Pending'
        ? 'Payment has already been initialized for this order'
        : 'Payment has already been completed for this order'
    );
  }

  const payableAmount = Number(orderDetails.paybleAmount);
  if (Number.isNaN(payableAmount) || payableAmount <= 0) {
    throw new Error('Invalid payable amount');
  }

  const paystackAmount = Math.round(payableAmount * 100);

  const response = await paystack.post('/transaction/initialize', {
    email,
    amount: paystackAmount,
    currency: 'NGN',
    channels: ['card', 'mobile_money'],
    metadata: {
      orderId,
      buyerId,
      sellerId,
      paymentType: 'NGN_PAYIN',
    },
  });

  const { authorization_url: authorizationUrl, reference } = response.data.data;

  await Payment.create({
    type: 'PayIn',
    orderId,
    reference,
    buyerId,
    sellerId,
    status: 'Pending',
    amount: payableAmount,
    currency: 'NGN',
    date: new Date(),
  });

  return {
    authorizationUrl,
    reference,
  };
};

const createSellerBankAccount = async (payload) => {
  const { sellerId, country, bankCode, accountNumber, firstName, lastName, fullName, bankName, phone, email } = payload;

  if (!sellerId || !country || !bankCode || !accountNumber) {
    throw new Error('sellerId, country, bankCode and accountNumber are required');
  }

  const existing = await SellerAccountDetails.findOne({ sellerId });
  if (existing) {
    throw new Error('Bank account already exists for this seller');
  }

  const accountName = country === 'NG' ? `${firstName} ${lastName}` : fullName;

  const subaccountRes = await paystack.post('/subaccount', {
    business_name: accountName,
    settlement_bank: bankCode,
    account_number: accountNumber,
    currency: country === 'NG' ? 'NGN' : 'ZAR',
    percentage_charge: 0,
    metadata: { sellerId, phone, email, country },
  });

  const recipientRes = await paystack.post('/transferrecipient', {
    type: country === 'NG' ? 'nuban' : 'bank_account',
    name: accountName,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: country === 'NG' ? 'NGN' : 'ZAR',
    metadata: { sellerId, phone, email },
  });

  const last4 = accountNumber.slice(-4);

  return SellerAccountDetails.create({
    sellerId,
    country,
    email,
    phone,
    bankCode,
    bankName,
    accountHolderFirstname: country === 'NG' ? firstName : undefined,
    accountHolderLastname: country === 'NG' ? lastName : undefined,
    accountHolderFullname: country !== 'NG' ? fullName : undefined,
    accountNumber: last4,
    subaccountCode: subaccountRes.data.data.subaccount_code,
    recipientCode: recipientRes.data.data.recipient_code,
  });
};

const paySeller = async (payload) => {
  if (!payload) {
    throw new Error('Payload is required');
  }

  const { sellerId, orderId } = payload;

  if (!sellerId || !orderId) {
    throw new Error('sellerId and orderId are required');
  }

  const sellerAccount = await SellerAccountDetails.findOne({
    sellerId,
    status: true,
  });

  if (!sellerAccount) {
    throw new Error('Seller payout account not found');
  }

  const orderDetails = await Order.findById(orderId);
  if (!orderDetails) {
    throw new Error('Order not found');
  }

  const existingPayout = await Payment.findOne({
    orderId,
    sellerId,
    type: 'Payout',
    status: { $in: ['Pending', 'Payout success'] },
  });

  if (existingPayout) {
    throw new Error(
      existingPayout.status === 'Pending'
        ? 'Seller payout is already pending for this order'
        : 'Seller payout has already been completed for this order'
    );
  }

  const payableAmount = Number(orderDetails.paybleAmount);
  const platformCharges = Number(orderDetails.platformCharges);

  if (Number.isNaN(payableAmount) || Number.isNaN(platformCharges) || payableAmount <= 0 || platformCharges < 0) {
    throw new Error('Invalid order amounts');
  }

  const sellerAmount = payableAmount - platformCharges;

  if (sellerAmount <= 0) {
    throw new Error('Invalid seller payout amount');
  }

  const response = await paystack.post('/transfer', {
    source: 'balance',
    amount: Math.round(sellerAmount * 100),
    recipient: sellerAccount.recipientCode,
    reason: `Payout for order ${orderId}`,
  });

  await Payment.create({
    orderId,
    sellerId,
    type: 'Payout',
    amount: sellerAmount,
    reference: response.data.data.reference,
    status: 'Pending',
    currency: orderDetails.currency || 'NGN',
    date: new Date(),
  });

  return response.data.data;
};

const refundBuyer = async (payload) => {
  const { orderId, reference, reason, buyerId, sellerId } = payload;

  const buyerPayment = await Payment.findOne({
    reference,
    type: 'PayIn',
    status: 'Payment success',
  });

  if (!buyerPayment) {
    throw new Error('Payment not successful');
  }

  const existingRefund = await Payment.findOne({ reference, type: 'Refund' });

  if (existingRefund) {
    throw new Error('Refund already initiated or Completed');
  }

  const refundPayload = {
    transaction: reference,
    reason: reason || `Refund for order ${orderId}`,
  };

  const orderDetails = await Order.findById(orderId);

  if (orderDetails) {
    refundPayload.amount = Math.round(orderDetails.paybleAmount * 100);
  }
  const response = await paystack.post('/refund', refundPayload);

  await Payment.create({
    orderId,
    buyerId,
    sellerId,
    type: 'Refund',
    amount: orderDetails.paybleAmount,
    reference,
    status: 'Refund initiated',
    refundReason: refundPayload.reason,
    date: new Date(),
  });

  return response.data.data;
};

module.exports = {
  testPaystackConnection,
  initializePayment,
  createSellerBankAccount,
  paySeller,
  refundBuyer,
};
