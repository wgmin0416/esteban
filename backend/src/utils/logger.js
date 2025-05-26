const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

const locationFormat = format((info) => {
  const err = new Error();
  Error.captureStackTrace(err);

  const stack = err.stack?.split('\n');
  const callerLine = stack?.[3] || '';
  const match = callerLine.match(/\((.*):(\d+):(\d+)\)/);

  if (match) {
    const [, filePath, line] = match;
    info.location = `${path.basename(filePath)}:${line}`;
  } else {
    info.location = 'unknown';
  }

  return info;
});

const logFormat = printf(({ level, message, timestamp, location }) => {
  return `[${timestamp}] ${level} (${location}): ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    colorize(), // 콘솔에 색상 출력
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    locationFormat(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // error 전용
    new transports.File({ filename: 'logs/combined.log' }), // 모든 로그
  ],
});

// morgan http log
logger.http = (msg) => {
  logger.log({ level: 'http', message: msg });
};

module.exports = logger;
