const axios = require('axios');
const config = require('./config');

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${config.payment.paystackSecretKey}`,
    'Content-Type': 'application/json',
  },
});

module.exports = paystack;
