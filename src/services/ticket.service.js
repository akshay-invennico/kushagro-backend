const httpStatus = require('http-status');
const mongoose = require('mongoose');
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
    matchStage.user = new mongoose.Types.ObjectId(filter.user);
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

const updateTicketStatusBulk = async (ticketIds, status) => {
  const updateData = {
    status,
  };

  if (status === 'CLOSED') {
    updateData.closedAt = new Date();
  }

  const result = await Ticket.updateMany(
    {
      _id: { $in: ticketIds },
      isDeleted: false,
    },
    {
      $set: updateData,
    }
  );

  if (result.matchedCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No tickets found to update');
  }

  return result;
};

const deleteTicketBulk = async (ticketIds, user) => {
  const tickets = await Ticket.find({
    _id: { $in: ticketIds },
    isDeleted: false,
  });

  if (!tickets.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tickets not found');
  }

  for (const ticket of tickets) {
    if (
      user.role === 'BUYER' ||
      (user.role === 'SELLER' && ticket.user.toString() !== user.id)
    ) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not allowed to delete one or more tickets');
    }
  }

  const result = await Ticket.updateMany(
    {
      _id: { $in: ticketIds },
    },
    {
      $set: { isDeleted: true },
    }
  );

  return {
    deletedCount: result.modifiedCount,
  };
};

module.exports = {
  createTicket,
  getAllTickets,
  queryTickets,
  getTicketById,
  updateTicketStatusBulk,
  deleteTicketBulk,
};
