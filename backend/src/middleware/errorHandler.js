const CustomError = require('../errors/customError');

function errorHandler(err, req, res, next) {
  console.error(err);
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  // uncaught error
  res.status(500).json({
    success: false,
    message: '서버 오류가 발생했습니다.',
  });
}

module.exports = errorHandler;
