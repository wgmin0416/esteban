const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    colorize(), // 콘솔에 색상 출력
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
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
