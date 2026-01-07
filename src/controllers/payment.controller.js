const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');

const testPaystackConnection = catchAsync(async (req, res) => {
  await paymentService.testPaystackConnection();
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Connected to Paystack successfully',
  });
});

const initializePayment = catchAsync(async (req, res) => {
  const data = await paymentService.initializePayment(req.body);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Payment initialized successfully',
    data,
  });
});

const createSellerBankAccount = catchAsync(async (req, res) => {
  const account = await paymentService.createSellerBankAccount(req.body);
  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Seller bank account created successfully',
    data: account,
  });
});

const paySeller = catchAsync(async (req, res) => {
  const payout = await paymentService.paySeller(req.body);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Seller payout initiated successfully',
    data: payout,
  });
});

const refundBuyer = catchAsync(async (req, res) => {
  const refund = await paymentService.refundBuyer(req.body);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Refund initiated successfully',
    data: refund,
  });
});

module.exports = {
  testPaystackConnection,
  initializePayment,
  createSellerBankAccount,
  paySeller,
  refundBuyer,
};
