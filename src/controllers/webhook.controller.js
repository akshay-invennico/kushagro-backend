const dotenv = require('dotenv');
const path = require('path');
const { processpaymentWebhook } = require('../services/webhook.service');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const signature = req.headers['verif-hash'];

    if (!secretHash) {
      return res.status(500).json({ error: 'Webhook config error' });
    }

    if (!signature) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (signature !== secretHash) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    await processpaymentWebhook(req.body);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = { handleFlutterwaveWebhook };
