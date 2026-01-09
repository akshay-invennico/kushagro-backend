const express = require('express');
const validate = require('../../middlewares/validate');
const paymentValidation = require('../../validations/payment.validation');

const {
  testPaystackConnection,
  initializePayment,
  createSellerBankAccount,
  paySeller,
  refundBuyer,
} = require('../../controllers/payment.controller');

const router = express.Router();

router.get('/connect/paystack', testPaystackConnection);
router.post('/initiate/payin', validate(paymentValidation.initializePayment), initializePayment);
router.post('/create/selleraccount', validate(paymentValidation.createSellerBankAccount), createSellerBankAccount);
router.post('/transfer/seller', validate(paymentValidation.paySeller), paySeller);
router.post('/refund/buyer', validate(paymentValidation.refundBuyer), refundBuyer);

module.exports = router;
