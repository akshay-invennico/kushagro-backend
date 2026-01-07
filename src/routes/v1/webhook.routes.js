const express = require('express');

const { handlePaystackWebhook } = require('../../controllers/webhook.controller');

const router = express.Router();

router.post('/paystack', handlePaystackWebhook);

module.exports = router;
