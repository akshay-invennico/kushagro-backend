const mongoose = require('mongoose');

const categoryFieldSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    type: {
      type: String,
      enum: ['TEXT', 'NUMBER', 'DROPDOWN', 'TEXTAREA'],
      required: true,
    },

    options: {
      type: [String],
      default: [],
    },

    isRequired: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

categoryFieldSchema.index({ categoryId: 1, key: 1 }, { unique: true });

const CategoryField = mongoose.model('CategoryField', categoryFieldSchema);
module.exports = CategoryField;
