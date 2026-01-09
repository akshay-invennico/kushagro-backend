const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().required().valid('user', 'admin'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      email: Joi.string().email().lowercase().trim(),
      phone: Joi.string().trim(),
      dialingCode: Joi.string().trim(),
      profile: Joi.string().trim().allow(null),
      address: Joi.string().trim().allow(null),
      bio: Joi.string().max(500),
      password: Joi.string().custom(password),

      // update not allowed
      role: Joi.forbidden(),
      isActive: Joi.forbidden(),
      isBlocked: Joi.forbidden(),
      isVerified: Joi.forbidden(),
      isAccountVerified: Joi.forbidden(),
      otp: Joi.forbidden(),
      otpExpiresAt: Joi.forbidden(),
    })
    .min(1)
    .options({ stripUnknown: true }),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    currentPassword: Joi.string().required().custom(password),
    newPassword: Joi.string().required().custom(password),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')),
  }),
};

const deleteAccount = {
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
    reason: Joi.string().required(),
  }),
};

const reportUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    reason: Joi.string().required(),
    image: Joi.string().allow('').optional(),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  changePassword,
  deleteAccount,
  reportUser,
};
