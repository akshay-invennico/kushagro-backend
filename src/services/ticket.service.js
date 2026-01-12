const httpStatus = require('http-status');
const Ticket = require('../models/ticket.model');
const ApiError = require('../utils/ApiError');

const createTicket = async (userId, body) => {
  return Ticket.create({
    user: userId,
    topic: body.topic,
    description: body.description,
    attachments: body.attachments,
  });
};

const queryTickets = async (filter, options) => {
  return Ticket.paginate(filter, options);
};

const getTicketById = async (ticketId) => {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    isDeleted: false,
  }).populate('user');

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }
  return ticket;
};

const updateTicketStatus = async (ticketId, status) => {
  const ticket = await getTicketById(ticketId);

  ticket.status = status;
  if (status === 'CLOSED') {
    ticket.closedAt = new Date();
  }

  await ticket.save();
  return ticket;
};

const deleteTicket = async (ticketId, user) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket || ticket.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  if (user.role === 'BUYER' || (user.role === 'SELLER' && ticket.user.toString() !== user.id)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not allowed to delete this ticket');
  }

  if (ticket.status === 'CLOSED') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Closed tickets cannot be deleted');
  }

  ticket.isDeleted = true;
  await ticket.save();

  return ticket;
};

module.exports = {
  createTicket,
  queryTickets,
  getTicketById,
  updateTicketStatus,
  deleteTicket,
};
