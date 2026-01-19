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
   const unit = productDetails.extraFields.unit;
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
    unit,
    price,
    subTotal,
    tax: taxAmount,
    platformCharges,
    totalAmount: payableAmount,
    paybleAmount: payableAmount,
    buyerId,
    sellerId,
    productId,
    status: 'PENDING',
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

  const orderStatusMap = {
    ongoing: 'PENDING',
    paid: 'PAID',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
  };

  const paymentStatusMap = {
    paid: 'Payment success',
    pending: 'Pending',
    refunded: 'Refund completed',
  };

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const orderMatch = {};

  if (orderStatus && orderStatus !== 'all') {
    if (!orderStatusMap[orderStatus]) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid order status');
    }
    orderMatch.status = orderStatusMap[orderStatus];
  }

  if (user.role === 'SELLER') orderMatch.sellerId = userId;
  else if (user.role === 'BUYER') orderMatch.buyerId = userId;
  else if (user.role !== 'ADMIN') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized role');
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

  const pipeline = [
    { $match: orderMatch },

    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'orderId',
        as: 'payments',
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
  ];

  if (category && category !== 'All') {
    pipeline.push({
      $match: { 'category.name': category },
    });
  }

  if (paymentStatus && paymentStatus !== 'all') {
    if (!paymentStatusMap[paymentStatus]) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid payment status');
    }

    pipeline.push({
      $match: {
        payments: {
          $elemMatch: {
            status: paymentStatusMap[paymentStatus],
          },
        },
      },
    });
  }

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
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};


const getOrderById = async ({ orderId }) => {
  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(orderId),
      },
    },

    /** Payment (latest successful PayIn) */
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

    /** Buyer */
    {
      $lookup: {
        from: 'users',
        localField: 'buyerId',
        foreignField: '_id',
        as: 'buyer',
      },
    },
    { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },

    /** Seller */
    {
      $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller',
      },
    },
    { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },

    /** Product */
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },

    /** Category */
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },

    /** Final Shape */
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
        },

        seller: {
          _id: '$seller._id',
          name: '$seller.name',
          email: '$seller.email',
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

  if (!result.length) {
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

  return Order.updateMany({ _id: { $in: orderIds } }, { $set: { status: 'COMPLETED' } });
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

  order.status = 'COMPLETED';
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

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.status === 'CANCELLED') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order already cancelled');
  }

  if (order.status === 'COMPLETED') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Completed orders cannot be cancelled');
  }

  const payInPayment = await Payment.findOne({
    orderId,
    type: 'PayIn',
  });

  if (payInPayment) {
    if (payInPayment.status === 'Refund initiated') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Refund already initiated. Please wait for completion.');
    }

    if (payInPayment.status === 'Payment success') {
      await Payment.updateOne({ _id: payInPayment._id }, { $set: { status: 'Refund initiated' } });
    }
  }

  const buyerPayment = await Payment.findOne({
    orderId,
    type: 'PayIn',
    status: 'Payment success',
  });

  if (!buyerPayment) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment not completed');
  }

  let transactionId = null;

  if (buyerPayment.authorization_Id && buyerPayment.authorization_Id.transactionId) {
    transactionId = buyerPayment.authorization_Id.transactionId;
  } else if (buyerPayment.reference) {
    transactionId = buyerPayment.reference;
  }

  if (!transactionId) {
    throw new Error('Transaction ID missing');
  }

  const refundPayload = {
    amount: order.paybleAmount,
    comments: cancellationReason || `Refund for order ${order.orderNumber}`,
  };

  const response = await payment.post(`/transactions/${transactionId}/refund`, refundPayload);

  if (response && response.data) {
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

    await Payment.create({
      orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      type: 'Refund',
      amount: order.paybleAmount.toString(),
      reference: transactionId,
      originalReference: buyerPayment.reference,
      status: 'Refund initiated',
      refund_reason: refundPayload.comments,
      date: new Date().toISOString(),
      currency: buyerPayment.currency || 'UGX',
    });
  }

  let message = 'Order cancelled successfully';
  let paymentStatus = null;

  if (payInPayment) {
    paymentStatus = payInPayment.status;
    if (payInPayment.status === 'Payment success') {
      message = 'Order cancelled and refund initiated';
      paymentStatus = 'Refund initiated';
    }
  }

  return {
    success: true,
    message,
    data: {
      orderId,
      orderStatus: 'CANCELLED',
      paymentStatus,
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




module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  sendOtpToBuyer,
  verifyOtpUpdateOrder,
  cancelOrder,
  flagOrders,
  resolveFlags
};
