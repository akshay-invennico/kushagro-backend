const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config');
const { tokenTypes } = require('./tokens');
const { User } = require('../models');
const logger = require('./logger');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
      const payload = jwt.verify(tokenString, config.jwt.secret);

      if (payload.type !== tokenTypes.ACCESS) {
        return next(new Error('Invalid token type'));
      }

      const user = await User.findById(payload.sub);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.error(`Socket authentication error: ${err.message}`);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.id} (${socket.user.role})`);

    socket.join(socket.user.id);
    socket.join(socket.user.role);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initSocket,
  getIo,
};
