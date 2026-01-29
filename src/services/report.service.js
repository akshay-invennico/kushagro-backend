const httpStatus = require('http-status');
const { Report, User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a report
 * @param {ObjectId} reporterId
 * @param {ObjectId} reportedId
 * @param {Object} reportBody
 * @returns {Promise<Report>}
 */
const createReport = async (reporterId, reportedId, reportBody) => {
  const reportedUser = await User.findById(reportedId);
  if (!reportedUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (reporterId.toString() === reportedId.toString()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot report yourself');
  }

  const report = await Report.create({
    reporterId,
    reportedId,
    ...reportBody,
  });

  reportedUser.isReported = true;
  await reportedUser.save();

  return report;
};

/**
 * Query for reports with filters and pagination
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryReports = async (filter, options) => {
  const reports = await Report.paginate(filter, {
    ...options,
    populate: 'reporterId,reportedId',
    sortBy: options.sortBy || 'createdAt:desc',
  });

  const reportDocs = await Report.populate(reports.results, [
    { path: 'reporterId', select: 'name email phone profile' },
    { path: 'reportedId', select: 'name email phone profile' },
  ]);

  return { ...reports, results: reportDocs };
};

/**
 * Get all reports for admin panel
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getAllReports = async (filter, options) => {
  const mongoFilter = {};

  if (filter.reportedId) {
    mongoFilter.reportedId = filter.reportedId;
  }

  if (filter.reporterId) {
    mongoFilter.reporterId = filter.reporterId;
  }

  if (filter.from || filter.to) {
    mongoFilter.createdAt = {};
    if (filter.from) {
      mongoFilter.createdAt.$gte = new Date(filter.from);
    }
    if (filter.to) {
      mongoFilter.createdAt.$lte = new Date(filter.to);
    }
  }

  return queryReports(mongoFilter, options);
};

/**
 * Get reports by user id (reports made against a user)
 * @param {ObjectId} userId
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getReportsByUserId = async (userId, options) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const filter = { reportedId: userId };
  return queryReports(filter, options);
};

/**
 * Get reports made by a user
 * @param {ObjectId} userId
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getReportsMadeByUser = async (userId, options) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const filter = { reporterId: userId };
  return queryReports(filter, options);
};

/**
 * Get report by id
 * @param {ObjectId} reportId
 * @returns {Promise<Report>}
 */
const getReportById = async (reportId) => {
  const report = await Report.findById(reportId)
    .populate('reporterId', 'name email phone profile')
    .populate('reportedId', 'name email phone profile');

  if (!report) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Report not found');
  }

  return report;
};

/**
 * Bulk delete reports by ids (hard delete)
 * @param {ObjectId[]} reportIds
 * @returns {Promise<{ deletedCount: number }>}
 */
const deleteReportById = async (reportIds) => {
  const result = await Report.deleteMany({
    _id: { $in: reportIds },
  });

  if (result.deletedCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No reports found to delete');
  }

  return {
    deletedCount: result.deletedCount,
  };
};

module.exports = {
  createReport,
  queryReports,
  getAllReports,
  getReportsByUserId,
  getReportsMadeByUser,
  getReportById,
  deleteReportById,
};
