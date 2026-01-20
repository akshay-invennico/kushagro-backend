const dotenv = require('dotenv');
const path = require('path');
const httpStatus = require('http-status');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const payment = require('../config/payment');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../../.env') });
const { sendVerificationEmail } = require('./email.service');
const { sendOtpSms } = require('./sms.service');
const notificationService = require('./notification.service');

function generateOrderNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

const createOrder = async (payload) => {
  const { buyerId, productId } = payload;
  const currency = 'UGX';
  const productDetails = await Product.findById(productId);
  if (!productDetails) throw new Error('Product not found');

  const { price } = productDetails;
  const { sellerId } = productDetails;
   const quantity=1;
  const checkBuyer = await User.findOne({ _id: buyerId, role: 'BUYER' });
  const checkSeller = await User.findOne({ _id: sellerId, role: 'SELLER' });
  if (!checkBuyer || !checkSeller) {
    throw new Error('Invalid buyer or seller');
  }

  const orderNumber = generateOrderNumber();
  const subTotal = quantity * price;
  const taxRate = Number(config.order.tax);
  const platformChargePer = Number(config.order.platformCharges);
  const taxAmount = (subTotal * taxRate) / 100;
  const platformCharges = (subTotal * platformChargePer) / 100;
  const payableAmount = subTotal + taxAmount + platformCharges;

  const order = await Order.create({
    orderNumber,
    quantity,
    price,
    subTotal,
    tax: taxAmount,
    platformCharges,
    totalAmount: payableAmount,
    paybleAmount: payableAmount,
    buyerId,
    sellerId,
    productId,
    status: 'ONGOING',
  });

  const reference = `FLW_${Date.now()}_${order._id}`;

  const response = await payment.post('/payments', {
    tx_ref: reference,
    amount: payableAmount,
    currency,
    redirect_url: process.env.FLUTTERWAVE_REDIRECT_URL || 'https://yourapp.com/payment/callback',
    payment_options: 'card,mobilemoney,banktransfer',
    customer: {
      email: checkBuyer.email,
      name: checkBuyer.name || 'Buyer',
    },
    meta: {
      orderId: order._id,
      buyerId,
      sellerId,
      paymentType: 'PAYIN',
    },
    customizations: {
      title: 'Order Payment',
      description: `Payment for order ${order.orderNumber}`,
    },
  });

  await Payment.create({
    type: 'PayIn',
    orderId: order._id,
    reference,
    buyerId,
    sellerId,
    status: 'Pending',
    amount: payableAmount.toString(),
    currency,
    date: new Date().toISOString(),
  });
  // notification for seller
  await notificationService.createNotification({
    recipient: sellerId,
    title: 'New Order Received',
    message: `New Order Received! Order #${orderNumber} has been placed.`,
    type: 'ORDER_PLACED',
    data: { orderId: order.id, role: 'SELLER' },
  });

  // notification for buyer
  await notificationService.createNotification({
    recipient: buyerId,
    title: 'Order Placed',
    message: `Order Placed! Your order #${orderNumber} has been placed successfully.`,
    type: 'ORDER_PLACED',
    data: { orderId: order.id, role: 'BUYER' },
  });

  return {
    order,
    authorizationUrl: response.data.data.link,
    reference,
  };
};

const getAllOrders = async (userId, query) => {
  const {
    orderStatus,
    paymentStatus,
    category,
    sort = 'newest',
    fromDate,
    toDate,
    amountFrom,
    amountTo,
  } = query;

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  /* ================= BASE MATCH ================= */
  const orderMatch = {};

  if (user.role === 'SELLER') orderMatch.sellerId = userId;
  else if (user.role === 'BUYER') orderMatch.buyerId = userId;
  else if (user.role !== 'ADMIN') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized role');
  }

  if (orderStatus && orderStatus !== 'all') {
    orderMatch.status = orderStatus.toUpperCase();
  }

  if (amountFrom || amountTo) {
    orderMatch.totalAmount = {};
    if (amountFrom) orderMatch.totalAmount.$gte = Number(amountFrom);
    if (amountTo) orderMatch.totalAmount.$lte = Number(amountTo);
  }

  if (fromDate || toDate) {
    orderMatch.createdAt = {};
    if (fromDate) orderMatch.createdAt.$gte = new Date(fromDate);
    if (toDate) orderMatch.createdAt.$lte = new Date(toDate);
  }

  /* ================= PIPELINE ================= */
  const pipeline = [
    { $match: orderMatch },

    /* ---------- PAYMENTS ---------- */
    {
      $lookup: {
        from: 'payments',
        let: { orderId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$orderId', '$$orderId'] },
            },
          },
        ],
        as: 'payments',
      },
    },

    /* ---------- FIND LATEST PAYMENT USING TIMESTAMP ---------- */
    {
      $addFields: {
        latestPayment: {
          $reduce: {
            input: '$payments',
            initialValue: null,
            in: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$$value', null] },
                    { $gt: ['$$this.createdAt', '$$value.createdAt'] },
                  ],
                },
                '$$this',
                '$$value',
              ],
            },
          },
        },
      },
    },

    /* ---------- PRODUCT ---------- */
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },

    /* ---------- CATEGORY ---------- */
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
  ];

  /* ================= CATEGORY FILTER ================= */
  if (category && category !== 'all') {
    pipeline.push({ $match: { 'category.name': category } });
  }

  /* ================= PAYMENT STATUS FILTER (LATEST ONLY) ================= */
  if (paymentStatus && paymentStatus !== 'all') {
    if (paymentStatus === 'pending') {
      pipeline.push({
        $match: {
          $or: [
            { latestPayment: null },
            { 'latestPayment.status': { $ne: 'Payment success' } },
          ],
        },
      });
    } else {
      pipeline.push({
        $match: {
          'latestPayment.status': paymentStatus,
        },
      });
    }
  }

  /* ================= ADMIN LOOKUPS ================= */
  if (user.role === 'ADMIN') {
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer',
        },
      },
      { $unwind: '$buyer' },

      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller',
        },
      },
      { $unwind: '$seller' }
    );
  }

  /* ================= FINAL PROJECTION ================= */
  pipeline.push({
    $project: {
      orderId: '$_id',
      date: '$createdAt',
      amount: '$totalAmount',
      status: '$status',

      /* ✅ REAL LATEST PAYMENT STATUS FROM DB */
      paymentStatus: {
        $cond: [
          { $ifNull: ['$latestPayment', false] },
          '$latestPayment.status',
          'Pending',
        ],
      },

      product: {
        name: '$product.name',
        image: { $arrayElemAt: ['$product.images', 0] },
        category: '$category.name',
        extraFields: '$product.extraFields',
      },

      buyer:
        user.role === 'ADMIN'
          ? {
              name: '$buyer.name',
              email: '$buyer.email',
              profile: '$buyer.profile',
            }
          : '$$REMOVE',

      seller:
        user.role === 'ADMIN'
          ? {
              name: '$seller.name',
              email: '$seller.email',
              profile: '$seller.profile',
            }
          : '$$REMOVE',
    },
  });

  /* ================= PAGINATION ================= */
  pipeline.push({
    $facet: {
      data: [
        { $sort: sort === 'older' ? { createdAt: 1 } : { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ],
      total: [{ $count: 'count' }],
    },
  });

  const result = await Order.aggregate(pipeline);

  const orders = result[0].data;
  const total = result[0].total[0]?.count || 0;

  return {
    data: orders,
    meta: {
      page,
      limit,
      totalResults: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};


const getOrderById = async ({ orderId }) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid order id');
  }

  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(orderId),
      },
    },

    {
      $lookup: {
        from: 'payments',
        let: { orderId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$orderId', '$$orderId'] },
                  { $eq: ['$type', 'PayIn'] },
                  { $eq: ['$status', 'Payment success'] },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          {
            $project: {
              reference: 1,
              status: 1,
              amount: 1,
              currency: 1,
              createdAt: 1,
              transactionId: '$authorization_Id.transactionId',
              flw_ref: '$authorization_Id.flw_ref',
            },
          },
        ],
        as: 'payment',
      },
    },
    { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },


    {
      $lookup: {
        from: 'users',
        localField: 'buyerId',
        foreignField: '_id',
        as: 'buyer',
      },
    },
    { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller',
      },
    },
    { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },


    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 1,
        orderNumber: 1,
        status: 1,
        quantity: 1,
        unit: 1,
        price: 1,
        subTotal: 1,
        tax: 1,
        platformCharges: 1,
        totalAmount: 1,
        paybleAmount: 1,
        createdAt: 1,

        payment: {
          reference: 1,
          status: 1,
          amount: 1,
          currency: 1,
          transactionId: 1,
          flw_ref: 1,
          createdAt: 1,
        },

        buyer: {
          _id: '$buyer._id',
          name: '$buyer.name',
          email: '$buyer.email',
          phone: '$buyer.phone',
          profile: '$buyer.profile'
        },

        seller: {
          _id: '$seller._id',
          name: '$seller.name',
          email: '$seller.email',
          profile: '$seller.profile'
        },

        product: {
          _id: '$product._id',
          name: '$product.name',
          price: '$product.price',
          images: '$product.images',
          extraFields: '$product.extraFields',
        },

        category: {
          _id: '$category._id',
          name: '$category.name',
        },
      },
    },
  ];

  const result = await Order.aggregate(pipeline);
  if (!result || result.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return result[0];
};


const updateOrder = async (payload) => {
  const { orderIds } = payload;
  const successfulPayments = await Payment.find({
    orderId: { $in: orderIds },
    type: 'PayIn',
    status: 'Payment success',
  }).select('orderId');
  const paidOrderIds = successfulPayments.map((p) => p.orderId.toString());

  if (paidOrderIds.length !== orderIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment not completed for one or more orders');
  }

  return Order.updateMany({ _id: { $in: orderIds } }, { $set: { status: 'COMPLETE' } });
};

const sendOtpToBuyer = async (payload) => {
  const { orderId } = payload;

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  const buyer = await User.findById(order.buyerId);
  if (!buyer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Buyer not found');
  }

  order.OTP = otp;
  order.otpExpiresAt = otpExpiry;
  await order.save();

  if (buyer.primaryKey === 'email') {
    if (!buyer.email) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Buyer email not found');
    }
    await sendVerificationEmail(buyer.email, otp);
  } else if (buyer.primaryKey === 'phone') {
    if (!buyer.phone) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Buyer phone not found');
    }
    await sendOtpSms(buyer.phone, otp);
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid primary key');
  }

  return {
    success: true,
    message: 'OTP sent successfully',
  };
};

const verifyOtpUpdateOrder = async (payload) => {
  const { orderId, otp } = payload;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (!order.OTP || !order.otpExpiresAt) {
    return {
      success: false,
      message: 'OTP not generated or already used',
    };
  }

  if (order.otpExpiresAt < new Date()) {
    return {
      success: false,
      message: 'OTP has expired',
    };
  }

  if (order.OTP !== otp) {
    return {
      success: false,
      message: 'Invalid OTP',
    };
  }

  const successfulPayment = await Payment.findOne({
    orderId,
    type: 'PayIn',
    status: 'Payment success',
  });

  if (!successfulPayment) {
    return {
      success: false,
      message: 'Payment not completed',
    };
  }

  order.status = 'COMPLETE';
  order.OTP = null;
  order.otpExpiresAt = null;
  await order.save();
  // notification for buyer
  await notificationService.createNotification({
    recipient: order.buyerId,
    title: 'Order Delivered',
    message: `Order Delivered! Your order #${orderDetails.orderNumber} has been delivered successfully.`,
    type: 'ORDER_DELIVERED',
    data: { orderId: order.id, role: 'BUYER' },
  });

  // notification for seller
  await notificationService.createNotification({
    recipient: order.sellerId,
    title: 'Order Completed',
    message: `Order Completed! Order #${orderDetails.orderNumber} has been delivered.`,
    type: 'ORDER_COMPLETED',
    data: { orderId: order.id, role: 'SELLER' },
  });

  return {
    success: true,
    message: 'OTP verified and order completed successfully',
  };
};

const cancelOrder = async (payload) => {
  const { orderId, note, cancellationReason } = payload;

  /* ================= ORDER VALIDATION ================= */
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.status === 'CANCELLED') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order already cancelled');
  }

  if (order.status === 'COMPLETE') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Completed orders cannot be cancelled'
    );
  }

  /* ================= PAYIN PAYMENT ================= */
  const paymentDoc = await Payment.findOne({
    orderId,
    type: 'PayIn',
    status: 'Payment success',
  });

  if (!paymentDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment not completed');
  }

  /* ================= PREVENT DOUBLE REFUND ================= */
  if (
    paymentDoc.type === 'Refund' &&
    ['Refund initiated', 'Refund completed'].includes(paymentDoc.status)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Refund already initiated for this order'
    );
  }

  /* ================= TRANSACTION ID ================= */
  let transactionId = null;

  if (paymentDoc.authorization_Id?.transactionId) {
    transactionId = paymentDoc.authorization_Id.transactionId;
  } else if (paymentDoc.reference) {
    transactionId = paymentDoc.reference;
  }

  if (!transactionId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction ID missing');
  }

  /* ================= REFUND REQUEST ================= */
  const refundPayload = {
    amount: order.paybleAmount,
    comments: cancellationReason || `Refund for order ${order.orderNumber}`,
  };

  const response = await payment.post(
    `/transactions/${transactionId}/refund`,
    refundPayload
  );

  if (!response?.data) {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Refund initiation failed');
  }

  /* ================= UPDATE ORDER ================= */
  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        cancellationReason: cancellationReason || 'Order cancelled',
        note: note || null,
        status: 'CANCELLED',
      },
    }
  );

  /* ================= UPDATE SAME PAYMENT DOCUMENT ================= */
  await Payment.updateOne(
    { _id: paymentDoc._id },
    {
      $set: {
        type: 'Refund',
        status: 'Refund initiated',
        refund_reason: refundPayload.comments,
        originalReference: paymentDoc.reference,
        reference: transactionId,
        updatedAt: new Date(),
      },
    }
  );

  /* ================= RESPONSE ================= */
  return {
    success: true,
    message: 'Order cancelled and refund initiated',
    data: {
      orderId,
      orderStatus: 'CANCELLED',
      paymentStatus: 'Refund initiated',
    },
  };
};


const flagOrders = async ({ orderIds, reason, note }) => {
  const ids = Array.isArray(orderIds) ? orderIds : [orderIds];

  const orders = await Order.find({
    _id: { $in: ids },
  });

  if (!orders.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Orders not found');
  }

  const alreadyFlagged = orders.filter(o => o.isFlagged);
  if (alreadyFlagged.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Some orders are already flagged`
    );
  }

  await Order.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isFlagged: true,
        flag: {
          reason,
          note,
          status: 'OPEN',
          flaggedAt: new Date(),
        },
      },
    }
  );

  return {
    flaggedCount: ids.length,
    orderIds: ids,
  };
};


const resolveFlags = async ({ orderIds }) => {
  const ids = Array.isArray(orderIds) ? orderIds : [orderIds];

  const result = await Order.updateMany(
    {
      _id: { $in: ids },
      isFlagged: true,
    },
    {
      $set: {
        isFlagged: false,
        'flag.status': 'RESOLVED',
        'flag.resolvedAt': new Date(),
      },
    }
  );

  if (!result.modifiedCount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No flagged orders found');
  }

  return {
    resolvedCount: result.modifiedCount,
    orderIds: ids,
  };
};


const getSellerOrders = async (sellerId, query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const matchStage = {
    sellerId: new mongoose.Types.ObjectId(sellerId),
  };

  const pipeline = [
    { $match: matchStage },

    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },

    {
      $lookup: {
        from: 'users',
        localField: 'buyerId',
        foreignField: '_id',
        as: 'buyer',
      },
    },
    { $unwind: '$buyer' },

    {
      $project: {
        orderId: '$_id',
        orderDate: '$createdAt',
        amount: '$totalAmount',
        status: '$status',

        product: {
          name: '$product.name',
          category: '$product.category',
          image: { $arrayElemAt: ['$product.images', 0] },
        },

        buyer: {
          name: '$buyer.name',
          email: '$buyer.email',
          profile: '$buyer.profile',
        },
      },
    },

    {
      $facet: {
        data: [
          { $sort: { orderDate: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await Order.aggregate(pipeline);

  const orders = result[0].data;
  const totalResults = result[0].total[0]?.count || 0;

  return {
    data: orders,
    meta: {
      page,
      limit,
      totalResults,
      totalPages: Math.ceil(totalResults / limit),
    },
  };
};


module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  sendOtpToBuyer,
  verifyOtpUpdateOrder,
  cancelOrder,
  flagOrders,
  resolveFlags,
  getSellerOrders
};
