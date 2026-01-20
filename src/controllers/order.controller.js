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
    message: 'Orders fetched successfully',
    data: orders,
    meta: {
      count: orders.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
      totalResults: pagination.total,
    },
    error: null,
  });
};

const getorderById = catchAsync(async (req, res) => {
  const data = await orderService.getOrderById(req.params.orderId);
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

const flagOrders = catchAsync(async (req, res) => {
  const { orderIds, reason, note } = req.body;

  const result = await orderService.flagOrders({
    orderIds,
    reason,
    note,
  });

  res.status(httpStatus.OK).send({
    message: 'Order(s) flagged successfully',
    ...result,
  });
});

const resolveOrderFlags = catchAsync(async (req, res) => {
  const { orderIds } = req.body;

  const result = await orderService.resolveFlags({ orderIds });

  res.status(httpStatus.OK).send({
    message: 'Order flag(s) resolved successfully',
    ...result,
  });
});

const getBuyerOrders = async (req, res) => {
  const buyerId = req.params.buyerId;

  const orders = await orderService.getBuyerOrders(buyerId, req.query);

  res.status(httpStatus.OK).json({
    success: true,
    data: orders,
  });
};





const getSellerOrders = async (req, res) => {
  const { sellerId } = req.params;

  const result = await orderService.getSellerOrders(sellerId, req.query);

  res.status(httpStatus.OK).json({
    success: true,
    ...result,
  });
};



module.exports = {
  createOrder,
  getOrders,
  getorderById,
  updateOrder,
  sendOrderOtp,
  verifyOrderOtp,
  cancelOrder,
  flagOrders,
  resolveOrderFlags,
  getBuyerOrders,
  getSellerOrders
};
