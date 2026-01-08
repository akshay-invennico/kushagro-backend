const mongoose = require('mongoose');

const { toJSON, paginate } = require('./plugins');

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    description: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 5,
        message: 'Maximum 5 images allowed',
      },
    },

    location: {
      address: {
        type: String,
        trim: true,
      },
      lat: Number,
      lng: Number,
    },

    extraFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.plugin(toJSON);
productSchema.plugin(paginate);

productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ sellerId: 1, status: 1 });
productSchema.index({ slug: 1, categoryId: 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
