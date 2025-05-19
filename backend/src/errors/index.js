const CustomError = require('./customError');

class BadRequestError extends CustomError {
  constructor(message = '잘못된 요청입니다.') {
    super(message, 400);
  }
}

class UnauthorizedError extends CustomError {
  constructor(message = '인증이 만료되었습니다. 다시 로그인해주세요.') {
    super(message, 401);
  }
}

class ForbiddenError extends CustomError {
  constructor(message = '접근 권한이 없습니다.') {
    super(message, 403);
  }
}

class NotFoundError extends CustomError {
  constructor(message = '요청한 리소스를 찾을 수 없습니다.') {
    super(message, 404);
  }
}

class BadGatewayError extends CustomError {
  constructor(message = '서버 에러가 발생했습니다.') {
    super(message, 500);
  }
}

module.exports = {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadGatewayError,
};
