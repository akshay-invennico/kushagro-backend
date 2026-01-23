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

const getAllTickets = async (filter, query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(query.limit, 10) || 10, 1);
  const skip = (page - 1) * limit;

  const matchStage = { isDeleted: false };

  if (filter.status) {
    matchStage.status = filter.status;
  }

  if (filter.createdAt) {
    matchStage.createdAt = filter.createdAt;
  }

  if (filter.user) {
    matchStage.user = filter.user;
  }

  const pipeline = [
    { $match: matchStage },

    // Lookup user who created the ticket
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' },

    {
      $project: {
        ticketId: '$ticketId',
        subject: '$topic',
        description: '$description',
        user: {
          name: '$userDetails.name',
          email: '$userDetails.email',
          profile: '$userDetails.profile',
          phone: '$userDetails.phone',
        },
        raisedOn: '$createdAt',
        status: '$status',
        attachments: '$attachments',
      },
    },

    {
      $facet: {
        data: [
          { $sort: { raisedOn: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await Ticket.aggregate(pipeline);

  const tickets = result[0].data;
  const totalResults = result[0].total[0]?.count || 0;

  return {
    data: tickets,
    meta: {
      page,
      limit,
      totalResults,
      totalPages: Math.ceil(totalResults / limit),
    },
  };
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
  getAllTickets,
  queryTickets,
  getTicketById,
  updateTicketStatus,
  deleteTicket,
};
