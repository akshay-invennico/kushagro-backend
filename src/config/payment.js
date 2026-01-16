const axios = require('axios');
const config = require('./config');

const payment = axios.create({
  baseURL: 'https://api.flutterwave.com/v3',
  headers: {
    Authorization: `Bearer ${config.payment.flutterwaveSecretKey}`,
    'Content-Type': 'application/json',
  },
});

module.exports = payment;
