const dotenv = require('dotenv');
const path = require('path');
const httpStatus = require('http-status');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const ApiError = require('../utils/ApiError');

dotenv.config({ path: path.join(__dirname, '../../.env') });
const { sendVerificationEmail } = require('./email.service');
const { sendOtpSms } = require('./sms.service');

function generateOrderNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

const createOrder = async (payload) => {
  const { quantity, unit, price, note, buyerId, sellerId, productId } = payload;
  const orderNumber = generateOrderNumber();
  const otp = generateOTP();
  const subTotal = quantity * price;
  const taxRate = Number(process.env.ADMIN_TAX);
  const platformChargePer = Number(process.env.PLATFORM_CHARGE);
  const taxAmount = (subTotal * taxRate) / 100;
  const platformCharges = (subTotal * platformChargePer) / 100;
  const totalAmount = subTotal + taxAmount + platformCharges;
  const paybleAmount = subTotal + taxAmount + platformCharges;

  if (!quantity || !price || !buyerId || !sellerId || !productId) {
    throw new Error('quantity,price,buyerId,sellerId,productId are required');
  }

  const checkBuyer = await User.findOne({ _id: buyerId, role: 'BUYER' });
  const checkSeller = await User.findOne({ _id: sellerId, role: 'SELLER' });

  if (!checkBuyer || !checkSeller) {
    throw new Error('Invalid BuyerId or sellerId please');
  }

  const orderSchema = {
    orderNumber,
    quantity,
    unit,
    price,
    note,
    subTotal,
    tax: taxAmount,
    platformCharges,
    totalAmount,
    paybleAmount,
    buyerId,
    sellerId,
    productId,
    OTP: otp,
  };
  const orderResponse = await Order.create(orderSchema);
  return {
    orederData: orderResponse,
  };
};

const getAllOrders = async (userId, query) => {
  const { status } = query;
  if (!status) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Status query is required');
  }

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

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'orderIds must be a non-empty array');
  }

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

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (!order.OTP) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP not found for this order');
  }

  const buyer = await User.findById(order.buyerId);
  if (!buyer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Buyer not found');
  }

  if (buyer.primaryKey === 'email') {
    if (!buyer.email) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Buyer email not found');
    }
    await sendVerificationEmail(buyer.email, order.OTP);
  } else if (buyer.primaryKey === 'phone') {
    if (!buyer.phone) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Buyer phone not found');
    }
    await sendOtpSms(buyer.phone, order.OTP);
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
  const orderDetails = await Order.findById(orderId);
  if (orderDetails.OTP === otp) {
    const successfulPayments = await Payment.find({
      orderId,
      type: 'PayIn',
      status: 'Payment success',
    }).select('orderId');

    if (successfulPayments) {
      await Order.findByIdAndUpdate({ _id: orderId }, { $set: { status: 'COMPLETED' } });
    }
    return {
      success: true,
      message: 'otp verified and order completed',
    };
  }
  return {
    success: false,
    message: 'wrong otp',
  };
};

module.exports = {
  createOrder,
  getAllOrders,
  getorderById,
  updateOrder,
  sendOtpToBuyer,
  verifyOtpUpdateOrder,
};
