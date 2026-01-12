const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const ticketSchema = mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'DONE'],
      default: 'OPEN',
      index: true,
    },

    attachments: {
      type: [String],
      default: [],
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    closedAt: Date,
  },
  {
    timestamps: true,
  }
);

ticketSchema.pre('save', function (next) {
  if (!this.ticketId) {
    this.ticketId = `SR${Math.floor(100000 + Math.random() * 900000)}`;
  }
  next();
});

ticketSchema.plugin(toJSON);
ticketSchema.plugin(paginate);

module.exports = mongoose.model('Ticket', ticketSchema);
