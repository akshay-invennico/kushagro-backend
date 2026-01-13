const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const imageRoute = require('./image.route');
const payStackRoute = require('./payment.route');
const orderRoute = require('./order.route');
const categoryRoute = require('./category.route');
const productRoute = require('./product.route');
const ticketRoute = require('./ticket.route');
const ratingRoute = require('./rating.route');
const notificationRoute = require('./notification.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/images',
    route: imageRoute,
  },
  {
    path: '/paystack',
    route: payStackRoute,
  },
  {
    path: '/order',
    route: orderRoute,
  },
  {
    path: '/category',
    route: categoryRoute,
  },
  {
    path: '/product',
    route: productRoute,
  },
  {
    path: '/ticket',
    route: ticketRoute,
  },
  {
    path: '/rating',
    route: ratingRoute,
  },
  {
    path: '/notification',
    route: notificationRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
