// middleware/httpLogger.js
const morgan = require('morgan');
const logger = require('./logger');

// Morgan이 winston으로 로그를 넘기도록 설정
const stream = {
  write: (message) => logger.http(message.trim()),
};

const httpLogger = morgan('combined', { stream });

module.exports = httpLogger;
