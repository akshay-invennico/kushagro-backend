const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');
const { tokenTypes } = require('../config/tokens');

const verifyCallback = (req, resolve, reject, requiredRights, allowTemporary) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  req.user = user;

  const isTemporaryToken = user.tokenType === tokenTypes.TEMPORARY_ACCESS;

  if (isTemporaryToken && !allowTemporary) {
    return reject(new ApiError(httpStatus.FORBIDDEN, 'Please complete your registration to access this resource'));
  }

  if (!isTemporaryToken && requiredRights.length) {
    const userRights = roleRights.get(user.role);
    const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));
    if (!hasRequiredRights && req.params.userId !== user.id) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  resolve();
};

const auth = (...requiredRights) => {
  const options =
    typeof requiredRights[requiredRights.length - 1] === 'object' &&
    !Array.isArray(requiredRights[requiredRights.length - 1])
      ? requiredRights.pop()
      : {};

  const allowTemporary = options.allowTemporary || false;

  return async (req, res, next) => {
    return new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights, allowTemporary))(
        req,
        res,
        next
      );
    })
      .then(() => next())
      .catch((err) => next(err));
  };
};

module.exports = auth;
