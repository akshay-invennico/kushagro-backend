const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const ticketService = require('../services/ticket.service');
const ApiError = require('../utils/ApiError');

const createTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.createTicket(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: ticket,
  });
});

const getTickets = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status']);
  filter.isDeleted = false;

  if (req.user.role === 'BUYER' || req.user.role === 'SELLER') {
    filter.user = req.user.id;
  }

  const { fromDate, toDate } = req.query;

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const result = await ticketService.getAllTickets(filter, req.query);

  res.json({
    success: true,
    message: 'Tickets fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getTicketDetails = catchAsync(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.ticketId);

  res.json({
    success: true,
    data: ticket,
  });
});

const updateTicketStatus = catchAsync(async (req, res) => {
  const { ticketIds, status } = req.body;

  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ticketIds must be a non-empty array');
  }

  if (!status) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'status is required');
  }

  await ticketService.updateTicketStatusBulk(ticketIds, status);

  res.json({
    success: true,
    message: `Tickets updated successfully`,
    data: null,
  });
});

const deleteTicket = catchAsync(async (req, res) => {
  const { ticketIds } = req.body;

  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ticketIds must be a non-empty array');
  }

  await ticketService.deleteTicketBulk(ticketIds, req.user);

  res.json({
    success: true,
    message: `Tickets deleted successfully`,
    data: null,
  });
});

module.exports = {
  createTicket,
  getTickets,
  getTicketDetails,
  updateTicketStatus,
  deleteTicket,
};
