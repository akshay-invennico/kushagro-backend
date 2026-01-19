const express = require('express');

const { handleFlutterwaveWebhook } = require('../../controllers/webhook.controller');

const router = express.Router();

router.post('/', handleFlutterwaveWebhook);

module.exports = router;
