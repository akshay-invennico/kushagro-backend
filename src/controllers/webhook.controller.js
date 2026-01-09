const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');
const { processWebhook } = require('../services/webhook.service');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const handlePaystackWebhook = async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

  const signature = req.headers['x-paystack-signature'];

  if (!signature || hash !== signature) {
    return res.sendStatus(401);
  }

  const payload = JSON.parse(req.body.toString());

  await processWebhook(payload);

  return res.sendStatus(200);
};

module.exports = { handlePaystackWebhook };
