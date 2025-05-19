const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient');
const config = require('../config/config');
const { maxAge, ...clearCookieOptions } = config.accessToken.cookieOptions;
const { promisify } = require('util');
const { UnauthorizedError, BadGatewayError } = require('../errors');

// 로그아웃
const logout = async (res, userId, message, next) => {
  try {
    if (userId) {
      await redisClient.del(`${userId}`);
    }
    res.clearCookie('access_token', clearCookieOptions);
    return next(new UnauthorizedError(message));
  } catch (err) {
    return next(new BadGatewayError('로그아웃 처리 중 오류가 발생했습니다.'));
  }
};

// 인증 미들웨어
const authMiddleware = async (req, res, next) => {
  try {
    const accessToken = req.cookies.access_token;
    // 1. Access Token이 없을 경우 로그아웃
    if (!accessToken) {
      return logout(res, null, '인증이 만료되었습니다. 다시 로그인해주세요.', next);
    }

    // Access Token 검증
    const verifyAsync = promisify(jwt.verify);
    try {
      await verifyAsync(accessToken, process.env.JWT_ACCESS_SECRET_KEY);
      // Access Token 유효
      return next();
    } catch (e) {
      // 2. Access Token이 만료 된 경우 Refresh Token 조회
      if (e.name === 'TokenExpiredError') {
        // Access Token의 id 조회
        const decodedAccessToken = jwt.decode(accessToken);
        if (!decodedAccessToken?.id) {
          return logout(res, null, '잘못된 토큰입니다. 다시 로그인 해주세요.', next);
        }
        // Refresh Token 조회
        const refreshToken = await redisClient.get(`${decodedAccessToken.id}`);
        if (!refreshToken) {
          return logout(res, null, '인증이 만료되었습니다. 다시 로그인 해주세요.', next);
        }
        // Refresh Token 검증
        let decodedRefreshToken;
        try {
          decodedRefreshToken = await verifyAsync(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);

          // Access Token 갱신
          res.clearCookie('access_token', clearCookieOptions); // 기존 Access Token 삭제
          const newAccessToken = jwt.sign(
            { id: decodedAccessToken.id },
            process.env.JWT_ACCESS_SECRET_KEY,
            { expiresIn: '2m' }
          );
          // Refresh Token 갱신
          await redisClient.del(`${decodedAccessToken.id}`); // 기존 Refresh Token 삭제
          const newRefreshToken = jwt.sign(
            { id: decodedAccessToken.id },
            process.env.JWT_REFRESH_SECRET_KEY,
            { expiresIn: '7d' }
          );
          await redisClient.set(`${decodedAccessToken.id}`, newRefreshToken, {
            EX: 60 * 60 * 24 * 7,
          });

          // Access token 전달 (Cookie)
          res.cookie('access_token', newAccessToken, config.accessToken.cookieOptions);
          return next();
        } catch (e) {
          // Refresh Token 만료
          return logout(
            res,
            decodedRefreshToken.id,
            '인증이 만료되었습니다. 다시 로그인 해주세요.',
            next
          );
        }
      } else {
        throw e;
      }
    }
  } catch (err) {
    throw new BadGatewayError('서버 오류로 인증이 실패했습니다.');
  }
};

module.exports = authMiddleware;
