const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { commissionService } = require('../services');

const createCommission = catchAsync(async (req, res) => {
  const commission = await commissionService.createCommission(req.body);
  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Commission settings updated successfully',
    data: commission,
  });
});

const getCommission = catchAsync(async (req, res) => {
  const commission = await commissionService.getCommission();
  if (!commission) {
    return res.status(httpStatus.OK).send({
      success: true,
      message: 'No commission settings found',
      data: null,
    });
  }
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Commission settings retrieved successfully',
    data: commission,
  });
});

module.exports = {
  createCommission,
  getCommission,
};
