const express = require('express');

const {
  testPaystackConnection,
  initializePayment,
  createSellerBankAccount,
  paySeller,
  refundBuyer,
} = require('../../controllers/payment.controller');

const router = express.Router();

router.get('/connect/paystack', testPaystackConnection);
router.post('/initiate/payin', initializePayment);
router.post('/create/selleraccount', createSellerBankAccount);
router.post('/transfer/seller', paySeller);
router.post('/refund/buyer', refundBuyer);

module.exports = router;
