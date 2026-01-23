const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const ticketService = require('../services/ticket.service');

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
  const ticket = await ticketService.updateTicketStatus(req.params.ticketId, req.body.status);

  res.json({
    success: true,
    message: 'Ticket status updated',
    data: ticket,
  });
});

const deleteTicket = catchAsync(async (req, res) => {
  await ticketService.deleteTicket(req.params.ticketId, req.user);

  res.json({
    success: true,
    message: 'Ticket deleted successfully',
  });
});

module.exports = {
  createTicket,
  getTickets,
  getTicketDetails,
  updateTicketStatus,
  deleteTicket,
};
