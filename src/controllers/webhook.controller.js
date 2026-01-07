const crypto = require('crypto');
const webhookService = require('../services/webhook.service');

const handlePaystackWebhook = async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];
  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

  if (!signature || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
    return res.sendStatus(401);
  }

  await webhookService.processWebhook(req.body);

  return res.sendStatus(200);
};

module.exports = { handlePaystackWebhook };
