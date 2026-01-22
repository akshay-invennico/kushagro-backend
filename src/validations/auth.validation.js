const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      email: Joi.string().email(),
      phone: Joi.string(),
      dialingCode: Joi.string(),
      password: Joi.string().required().custom(password),
      primaryKey: Joi.string().required(),
    })
    .or('email', 'phone')
    .when(Joi.object({ phone: Joi.exist() }).unknown(), {
      then: Joi.object({
        dialingCode: Joi.string().required(),
      }),
    }),
};

const verifyOtp = {
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      phone: Joi.string(),
      otp: Joi.number().integer().min(1000).max(9999).required(),
    })
    .or('email', 'phone'),
};

const login = {
  body: Joi.object().keys({
    phone: Joi.string(),
    email: Joi.string(),
    password: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      phone: Joi.string(),
    })
    .or('email', 'phone'),
};

const resetPassword = {
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      phone: Joi.string(),
      otp: Joi.number().integer().required(),
      password: Joi.string().required().custom(password),
    })
    .or('email', 'phone'),
};

const completeRegistration = {
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      phone: Joi.string(),
      role: Joi.string().required(),
      governmentId: Joi.string(),
    })
    .or('email', 'phone'),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyOtp,
  completeRegistration,
};
