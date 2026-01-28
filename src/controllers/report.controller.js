const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { reportService } = require('../services');
const pick = require('../utils/pick');

/**
 * Report a user
 * @param {Object} req
 * @param {Object} res
 */
const reportUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  await reportService.createReport(req.user._id, userId, {
    ...req.body,
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'User reported successfully',
    data: null,
    meta: {},
    error: null,
  });
});

/**
 * Get all reports for admin panel
 * @param {Object} req
 * @param {Object} res
 */
const getAllReports = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['reportedId', 'reporterId', 'from', 'to']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await reportService.getAllReports(filter, options);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Reports fetched successfully',
    data: result.results,
    meta: {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    },
    error: null,
  });
});

/**
 * Get all reports by user id (reports made against a user)
 * @param {Object} req
 * @param {Object} res
 */
const getReportsByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await reportService.getReportsByUserId(userId, options);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Reports fetched successfully',
    data: result.results,
    meta: {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    },
    error: null,
  });
});

/**
 * Get reports made by a user
 * @param {Object} req
 * @param {Object} res
 */
const getReportsMadeByUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await reportService.getReportsMadeByUser(userId, options);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Reports fetched successfully',
    data: result.results,
    meta: {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    },
    error: null,
  });
});

/**
 * Get report by id
 * @param {Object} req
 * @param {Object} res
 */
const getReportById = catchAsync(async (req, res) => {
  const { reportId } = req.params;

  const report = await reportService.getReportById(reportId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Report fetched successfully',
    data: report,
    meta: {},
    error: null,
  });
});

/**
 * Bulk delete reports (hard delete)
 * @param {Object} req
 * @param {Object} res
 */
const deleteReport = catchAsync(async (req, res) => {
  const { reportIds } = req.body;

  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'reportIds must be a non-empty array'
    );
  }

  const result = await reportService.deleteReportById(reportIds);

  res.status(httpStatus.OK).json({
    success: true,
    message: `${result.deletedCount} report(s) deleted successfully`,
    data: null,
    meta: {},
    error: null,
  });
});

module.exports = {
  reportUser,
  getAllReports,
  getReportsByUserId,
  getReportsMadeByUser,
  getReportById,
  deleteReport,
};
