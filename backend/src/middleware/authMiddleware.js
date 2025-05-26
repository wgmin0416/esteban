const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient');
const config = require('../config/config');
const { maxAge, ...clearCookieOptions } = config.accessToken.cookieOptions;
const { promisify } = require('util');
const { logout } = require('../controllers/userController');

// 인증 미들웨어
const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.access_token;
  // 1. Access Token이 없을 경우 로그아웃
  if (!accessToken) {
    console.log('!access token');
    await logout(req, res);
    return;
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
        logger.info("Access Token is missing or has not property 'id'");
        await logout(req, res);
        return;
      }
      // Refresh Token 조회
      const refreshToken = await redisClient.get(`${decodedAccessToken.id}`);
      if (!refreshToken) {
        logger.info(`[LOGIN ID]: ${decodedAccessToken.id} / Refresh Token is missing`);
        await logout(req, res);
        return;
      }
      // Refresh Token 검증
      try {
        await verifyAsync(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);

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
        logger.info(`[LOGIN ID]: ${decodedAccessToken.id} / Refresh Token is expired`);
        await logout(req, res);
        return;
      }
    } else {
      logger.error(e);
      throw e;
    }
  }
};

module.exports = authMiddleware;
