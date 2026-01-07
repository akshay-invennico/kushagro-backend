const paystack = require('../config/payStack');
const Payment = require('../models/payment.model');
const SellerAccountDetails = require('../models/sellerAccountDetails');

const testPaystackConnection = async () => {
  await paystack.get('/bank');
  return true;
};

const initializePayment = async (payload) => {
  const { email, amount, orderId, buyerId, sellerId } = payload;

  if (!email || !amount || !orderId) {
    throw new Error('email, amount, and orderId are required');
  }

  const paystackAmount = Math.round(amount * 100);

  const response = await paystack.post('/transaction/initialize', {
    email,
    amount: paystackAmount,
    currency: 'NGN',
    channels: ['card'],
    metadata: {
      orderId,
      buyerId,
      sellerId,
      paymentType: 'NGN_PAYIN',
    },
  });

  await Payment.create({
    type: 'PayIn',
    orderId,
    reference: response.data.data.reference,
    buyerId,
    sellerId,
    status: 'Pending',
    amount,
    currency: 'NGN',
    adminCommission: amount * (Number(process.env.Admin_commision) / 100),
    date: new Date(),
  });

  return {
    authorizationUrl: response.data.data.authorization_url,
    reference: response.data.data.reference,
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

const paySeller = async ({ sellerId, orderId, totalAmount }) => {
  const sellerAccount = await SellerAccountDetails.findOne({ sellerId, status: true });

  if (!sellerAccount) {
    throw new Error('Seller payout account not found');
  }

  const commissionPercent = Number(process.env.Admin_commision || 10);
  const adminCommission = (totalAmount * commissionPercent) / 100;
  const sellerAmount = totalAmount - adminCommission;

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
    adminCommission,
    reference: response.data.data.reference,
    status: 'Pending',
  });

  return response.data.data;
};

const refundBuyer = async (payload) => {
  const { orderId, reference, reason, amount, buyerId, sellerId } = payload;

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
    throw new Error('Refund already initiated');
  }

  const refundPayload = {
    transaction: reference,
    reason: reason || `Refund for order ${orderId}`,
  };

  if (amount) {
    refundPayload.amount = Math.round(amount * 100);
  }

  const response = await paystack.post('/refund', refundPayload);

  await Payment.create({
    orderId,
    buyerId,
    sellerId,
    type: 'Refund',
    amount: amount || response.data.data.amount / 100,
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
