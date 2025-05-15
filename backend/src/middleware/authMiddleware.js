const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient');
const config = require('../config/config');
const { maxAge, ...clearCookieOptions } = config.accessToken.cookieOptions;
const { promisify } = require('util');

// 로그아웃
const logout = async (res, userId) => {
  if (userId) {
    await redisClient.del(`${userId}`);
  }
  res.clearCookie('access_token', clearCookieOptions);
  return res.status(401).json({
    success: false,
    message: '인증이 만료되었습니다. 다시 로그인 해주세요.',
  });
};

// 인증 미들웨어
const authMiddleware = async (req, res, next) => {
  try {
    const accessToken = req.cookies.access_token;
    // 1. Access Token이 없을 경우 로그아웃
    if (!accessToken) {
      return logout(res);
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
          return res
            .status(401)
            .json({ success: false, message: '잘못된 토큰입니다. 다시 로그인 해주세요.' });
        }
        // Refresh Token 조회
        const refreshToken = await redisClient.get(`${decodedAccessToken.id}`);
        if (!refreshToken) {
          return res
            .status(401)
            .json({ success: false, message: '인증이 만료되었습니다. 다시 로그인 해주세요.' });
        }
        // Refresh Token 검증
        try {
          const decodedRefreshToken = await verifyAsync(
            refreshToken,
            process.env.JWT_REFRESH_SECRET_KEY
          );

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
          res.clearCookie('access_token', clearCookieOptions);
          res
            .status(401)
            .json({ success: false, message: '인증이 만료되었습니다. 다시 로그인 해주세요.' });
        }
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error('[authMiddleware error]', err);
    return res.status(500).json({ success: false, message: '서버 오류로 인증이 실패했습니다.' });
  }
};

module.exports = authMiddleware;
