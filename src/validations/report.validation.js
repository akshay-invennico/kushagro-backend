const Joi = require('joi');
const { objectId } = require('./custom.validation');

const reportUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    reason: Joi.array().items(Joi.string().required()).min(1).required(),
    image: Joi.string().allow('').optional(),
  }),
};

const getAllReports = {
  query: Joi.object().keys({
    reportedId: Joi.string().custom(objectId),
    reporterId: Joi.string().custom(objectId),
    from: Joi.date(),
    to: Joi.date(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),
};

const getReportsByUserId = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),
};

const getReportsMadeByUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),
};

const getReportById = {
  params: Joi.object().keys({
    reportId: Joi.string().custom(objectId).required(),
  }),
};

const deleteReport = {
  params: Joi.object().keys({
    reportId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  reportUser,
  getAllReports,
  getReportsByUserId,
  getReportsMadeByUser,
  getReportById,
  deleteReport,
};
