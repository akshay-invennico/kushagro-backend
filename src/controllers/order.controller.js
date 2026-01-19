const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const orderService = require('../services/order.service');

const createOrder = catchAsync(async (req, res) => {
  const data = await orderService.createOrder(req.body);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'order created successfully',
    data,
  });
});

const getOrders = async (req, res) => {
  const userId = req.user._id;

  const { orders, pagination } =
    await orderService.getAllOrders(userId, req.query);

  res.status(httpStatus.OK).json({
    success: true,
    count: orders.length,
    ...pagination,
    data: orders,
  });
};

const getorderById = catchAsync(async (req, res) => {
  const data = await orderService.getorderById(req.params.orderId);
  if (!data) {
    res.status(httpStatus.NOT_FOUND).send({
      success: false,
      message: 'Order details not found',
    });
  }
  res.status(httpStatus.OK).send({
    success: true,
    data,
  });
});

const updateOrder = async (req, res) => {
  try {
    const result = await orderService.updateOrder(req.body);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Order status updated successfully',
      data: result,
    });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

const sendOrderOtp = async (req, res) => {
  try {
    const result = await orderService.sendOtpToBuyer(req.body);

    res.status(httpStatus.OK).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

const verifyOrderOtp = async (req, res) => {
  try {
    const result = await orderService.verifyOtpUpdateOrder(req.body);

    res.status(httpStatus.OK).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

const cancelOrder = catchAsync(async (req, res) => {
  const data = await orderService.cancelOrder(req.body);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'order cancelled successfully',
    data,
  });
});
module.exports = {
  createOrder,
  getOrders,
  getorderById,
  updateOrder,
  sendOrderOtp,
  verifyOrderOtp,
  cancelOrder,
};
