const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

// Sub-schema for addresses
const addressSchema = mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, trim: true },
    flatHouseNo: { type: String, trim: true },
    streetArea: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, trim: true },
    pincode: { type: String, trim: true },
    addressType: {
      type: String,
      default: 'home',
    },
  },
  { _id: false } // prevents creating separate _id for each address
);

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email address');
        }
      },
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    dialingCode: {
      type: String,
      trim: true,
    },
    fcmToken: {
      type: String,
    },
    primaryKey: {
      type: String,
      enum: ['phone', 'email'],
      default: 'email',
    },
    profile: {
      type: String,
      trim: true,
      default: null,
    },
    addresses: {
      type: [addressSchema], // array of address objects
      default: [],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    governmentId: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      private: true,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
    },
    otp: {
      type: Number,
      private: true,
    },
    orderOtp: {
      type: Number,
      private: true,
    },
    orderOtpExpiresAt: {
      type: Date,
    },
    otpExpiresAt: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isAccountVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: roles,
      default: 'BUYER',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    identityVerificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    rejectionReasons: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Plugins
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

// Static methods
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.statics.isPhoneTaken = async function (phone, excludeUserId) {
  const user = await this.findOne({ phone, _id: { $ne: excludeUserId } });
  return !!user;
};

// Instance methods
userSchema.methods.isPasswordMatch = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
