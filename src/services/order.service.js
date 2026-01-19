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
  const { quantity, unit, note, buyerId, productId } = payload;
  const currency = 'UGX';
  const productDetails = await Product.findById(productId);
  if (!productDetails) throw new Error('Product not found');

  const { price } = productDetails;
  const { sellerId } = productDetails;

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
    note,
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
    data: { orderId: orderResponse.id, role: 'SELLER' },
  });

  // notification for buyer
  await notificationService.createNotification({
    recipient: buyerId,
    title: 'Order Placed',
    message: `Order Placed! Your order #${orderNumber} has been placed successfully.`,
    type: 'ORDER_PLACED',
    data: { orderId: orderResponse.id, role: 'BUYER' },
  });

  return {
    order,
    authorizationUrl: response.data.data.link,
    reference,
  };
};

const getAllOrders = async (userId, query) => {
  const { status } = query;
  const statusMap = {
    ongoing: 'PENDING',
    completed: 'COMPLETED',
  };

  if (!statusMap[status]) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const filter = { status: statusMap[status] };

  if (user.role === 'SELLER') {
    filter.sellerId = userId;
  } else if (user.role === 'BUYER') {
    filter.buyerId = userId;
  } else if (user.role !== 'ADMIN') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized role');
  }

  return Order.find(filter).sort({ createdAt: -1 });
};

const getorderById = async (payload) => {
  const { orderId } = payload;
  const orderDetails = await Order.findById(orderId);
  if (!orderDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'order not found');
  }
  return {
    orderDetails,
  };
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

<<<<<<< HEAD
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (!order.OTP || !order.otpExpiresAt) {
=======
    if (successfulPayments) {
      await Order.findByIdAndUpdate({ _id: orderId }, { $set: { status: 'COMPLETED' } });

      // notification for buyer
      await notificationService.createNotification({
        recipient: orderDetails.buyerId,
        title: 'Order Delivered',
        message: `Order Delivered! Your order #${orderDetails.orderNumber} has been delivered successfully.`,
        type: 'ORDER_DELIVERED',
        data: { orderId: orderDetails.id, role: 'BUYER' },
      });

      // notification for seller
      await notificationService.createNotification({
        recipient: orderDetails.sellerId,
        title: 'Order Completed',
        message: `Order Completed! Order #${orderDetails.orderNumber} has been delivered.`,
        type: 'ORDER_COMPLETED',
        data: { orderId: orderDetails.id, role: 'SELLER' },
      });
    }
>>>>>>> 5ffdc2084b984233609a7f0043b667ba6e49a117
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

module.exports = {
  createOrder,
  getAllOrders,
  getorderById,
  updateOrder,
  sendOtpToBuyer,
  verifyOtpUpdateOrder,
  cancelOrder,
};
