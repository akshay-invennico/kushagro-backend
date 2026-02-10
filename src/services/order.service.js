const dotenv = require('dotenv');
const path = require('path');
const httpStatus = require('http-status');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const Commission = require('../models/commission.model');

dotenv.config({ path: path.join(__dirname, '../../.env') });
const { sendVerificationEmail, sendOrderPlacedEmail } = require('./email.service');
const { sendOtpSms } = require('./sms.service');
const notificationService = require('./notification.service');

const generateOrderNumber = async () => {
  const lastOrder = await Order.findOne({})
    .sort({ createdAt: -1 })
    .select('orderNumber');

  let nextNumber = 1;

  if (lastOrder?.orderNumber) {
    const lastNumericPart = parseInt(lastOrder.orderNumber.replace('KSA', ''), 10);
    nextNumber = lastNumericPart + 1;
  }

  return `KSA${String(nextNumber).padStart(6, '0')}`;
};


function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

const createOrder = async (payload) => {
  const { buyerId, productId, buyerAddress } = payload;
  const currency = 'UGX';
  const productDetails = await Product.findById(productId);
  if (!productDetails) throw new Error('Product not found');

  const { price } = productDetails;
  const { sellerId } = productDetails;
  const quantity = 1;
  const checkBuyer = await User.findOne({ _id: buyerId, role: 'BUYER' });
  const checkSeller = await User.findOne({ _id: sellerId, role: 'SELLER' });
  if (!checkBuyer || !checkSeller) {
    throw new Error('Invalid buyer or seller');
  }

  const commission = await Commission.findOne();

  const orderNumber = await generateOrderNumber();
  const subTotal = quantity * price;

  const taxRate = productDetails.tax !== undefined ? productDetails.tax : (commission?.commissionPercentage || 0);
  const platformChargePer = commission?.platformCharges || 0;

  const taxAmount = (taxRate > 0)
    ? (subTotal * taxRate) / 100
    : 0;

  const platformCharges = commission?.isPlatformChargesApplied
    ? (subTotal * platformChargePer) / 100
    : 0;

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
    buyerAddress,
    status: 'ONGOING',
  });

  // const reference = `FLW_${Date.now()}_${order._id}`;

  // const response = await payment.post('/payments', {
  //   tx_ref: reference,
  //   amount: payableAmount,
  //   currency,
  //   redirect_url: process.env.FLUTTERWAVE_REDIRECT_URL || 'https://yourapp.com/payment/callback',
  //   payment_options: 'card,mobilemoney,banktransfer',
  //   customer: {
  //     email: checkBuyer.email,
  //     name: checkBuyer.name || 'Buyer',
  //   },
  //   meta: {
  //     orderId: order._id,
  //     buyerId,
  //     sellerId,
  //     paymentType: 'PAYIN',
  //   },
  //   customizations: {
  //     title: 'Order Payment',
  //     description: `Payment for order ${order.orderNumber}`,
  //   },
  // });

  await Payment.create({
    type: 'PayIn',
    paymentMode: 'CASH',
    orderId: order._id,
    buyerId,
    sellerId,
    status: 'Pending',
    amount: payableAmount.toString(),
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

  if (checkBuyer.email) {
    const items = [{
      name: productDetails.name,
      quantity: quantity,
      price: productDetails.price
    }];
    await sendOrderPlacedEmail(checkBuyer.email, checkBuyer.name, orderNumber, items, payableAmount);
  }

  return {
    order,
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
      orderNumber: '$orderNumber',
      isFlagged: '$isFlagged',

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
        price: '$product.price'
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
        from: 'ratings',
        let: { sellerId: '$seller._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$sellerId', '$$sellerId'] },
                  { $eq: ['$isDeleted', false] },
                ],
              },
            },
          },
          {
            $group: {
              _id: '$sellerId',
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 },
            },
          },
        ],
        as: 'sellerRating',
      },
    },
    {
      $unwind: {
        path: '$sellerRating',
        preserveNullAndEmptyArrays: true,
      },
    },
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
        deliveryDate: 1,
        buyerAddress: 1,
        cancellationReason: { $ifNull: ['$cancellationReason', null] },
        note: { $ifNull: ['$note', null] },
        OTP: { $ifNull: ['$OTP', null] },
        otpExpiresAt: { $ifNull: ['$otpExpiresAt', null] },
        otpSent: { $ifNull: ['$otpSent', false] },
        otpVerified: { $ifNull: ['$otpVerified', false] },

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

        sellerId: {
          _id: '$seller._id',
          profile: '$seller.profile',
          name: '$seller.name',
          email: '$seller.email',
          bio: '$seller.bio',
          identityVerificationStatus: '$seller.identityVerificationStatus',
          averageRating: {
            $ifNull: [{ $round: ['$sellerRating.averageRating', 1] }, 0],
          },
          totalReviews: {
            $ifNull: ['$sellerRating.totalReviews', 0],
          },
        },

        product: {
          _id: '$product._id',
          name: '$product.name',
          price: '$product.price',
          images: '$product.images',
          extraFields: '$product.extraFields',
          location: {
            address: '$product.location.address',
            lat: '$product.location.lat',
            lng: '$product.location.lng',
          },
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
  order.otpSent = true;
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
    return {
      success: false,
      message: 'Order not found',
    };
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

  // const successfulPayment = await Payment.findOne({
  //   orderId,
  //   type: 'PayIn',
  //   status: 'Payment success',
  // });

  // if (!successfulPayment) {
  //   return {
  //     success: false,
  //     message: 'Payment not completed',
  //   };
  // }

  // Update order
  order.status = 'COMPLETE';
  order.OTP = null;
  order.otpVerified = true;
  order.otpExpiresAt = null;
  order.deliveryDate = new Date();
  await order.save();

  //update the payment status
  await Payment.findOneAndUpdate({ orderId: orderId, type: 'PayIn' }, { $set: { status: 'Payment success' } }, { new: true })

  // notification for buyer
  await notificationService.createNotification({
    recipient: order.buyerId,
    title: 'Order Delivered',
    message: `Order Delivered! Your order #${order.orderNumber} has been delivered successfully.`,
    type: 'ORDER_DELIVERED',
    data: { orderId: order.id, role: 'BUYER' },
  });

  // notification for seller
  await notificationService.createNotification({
    recipient: order.sellerId,
    title: 'Order Completed',
    message: `Order Completed! Order #${order.orderNumber} has been delivered.`,
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

  // /* ================= PAYIN PAYMENT ================= */
  // const paymentDoc = await Payment.findOne({
  //   orderId,
  //   type: 'PayIn',
  //   status: 'Payment success',
  // });

  // if (!paymentDoc) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Payment not completed');
  // }

  // /* ================= PREVENT DOUBLE REFUND ================= */
  // if (
  //   paymentDoc.type === 'Refund' &&
  //   ['Refund initiated', 'Refund completed'].includes(paymentDoc.status)
  // ) {
  //   throw new ApiError(
  //     httpStatus.BAD_REQUEST,
  //     'Refund already initiated for this order'
  //   );
  // }

  // /* ================= TRANSACTION ID ================= */
  // let transactionId = null;

  // if (paymentDoc.authorization_Id?.transactionId) {
  //   transactionId = paymentDoc.authorization_Id.transactionId;
  // } else if (paymentDoc.reference) {
  //   transactionId = paymentDoc.reference;
  // }

  // if (!transactionId) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction ID missing');
  // }

  // /* ================= REFUND REQUEST ================= */
  // const refundPayload = {
  //   amount: order.paybleAmount,
  //   comments: cancellationReason || `Refund for order ${order.orderNumber}`,
  // };

  // const response = await payment.post(
  //   `/transactions/${transactionId}/refund`,
  //   refundPayload
  // );

  // if (!response?.data) {
  //   throw new ApiError(httpStatus.BAD_GATEWAY, 'Refund initiation failed');
  // }

  /* ================= UPDATE ORDER ================= */
  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || 'Order cancelled',
        note: note || null,
      },
    }
  );

  // /* ================= UPDATE SAME PAYMENT DOCUMENT ================= */
  // await Payment.updateOne(
  //   { _id: paymentDoc._id },
  //   {
  //     $set: {
  //       type: 'Refund',
  //       status: 'Refund initiated',
  //       refund_reason: refundPayload.comments,
  //       originalReference: paymentDoc.reference,
  //       reference: transactionId,
  //       updatedAt: new Date(),
  //     },
  //   }
  // );

  /* ================= RESPONSE ================= */
  return {
    success: true,
    message: 'Order cancelled',
    data: {
      orderId,
      orderStatus: 'CANCELLED',
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
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },

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
        orderNumber: '$orderNumber',
        orderDate: '$createdAt',
        amount: '$totalAmount',
        status: '$status',

        product: {
          name: '$product.name',
          category: '$category.name',
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




const getBuyerOrders = async (buyerId, query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const matchStage = {
    buyerId: new mongoose.Types.ObjectId(buyerId),
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
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },

    {
      $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller',
      },
    },
    { $unwind: '$seller' },

    {
      $project: {
        orderId: '$_id',
        orderNumber: '$orderNumber',
        orderDate: '$createdAt',
        amount: '$totalAmount',
        status: '$status',

        product: {
          name: '$product.name',
          category: '$category.name',
          image: { $arrayElemAt: ['$product.images', 0] },
        },

        seller: {
          name: '$seller.name',
          email: '$seller.email',
          profile: '$seller.profile',
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
  getSellerOrders,
  getBuyerOrders
};
