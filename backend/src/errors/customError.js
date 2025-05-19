class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Error.captureStackTrace는 에러 발생 위치 추적에 도움
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
