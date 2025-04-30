const jwt = require('jsonwebtoken');
const { hashValue } = require('../utils/bcrypt');
const redisClient = require('../config/redisClient');

// 인증 체크
const authMiddleware = async (req, res, next) => {
  // 1. Access token 검증
  // 2. Access token 만료 시 Redis Refresh token 조회
  // 3-1. Redis Refresh token이 없을 경우 로그아웃 처리
  // 3-2. Redis Refresh token이 있을 경우 unhashing 후 검증
  try {
    const accessToken = req.cookies['access_token'];
    console.log('accessToken: ', accessToken);

    // API 요청 시 Access token 없을 경우 401
    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'Access token missing' });
    }

    // 1. Access token 검증
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET_KEY, async (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
        console.log('Access token 유효');
        return next(); // Access token 유효 시 컨트롤러 이동
      }

      // 2. Access token 만료 시 Redis Refresh token 조회
      // Redis에 존재하지 않을 경우 만료(bcrypt 단방향 암호화로 토큰 복호화 후 검증은 불가)
      console.log('Access token 만료, Redis Refresh token 조회');
      const redisRefreshToken = await redisClient.get(req.user.id);
      if (!redisRefreshToken) {
        console.log('Redis Refresh token 없음. 만료 처리');
        return res.status(401).json({ success: false, message: '인증이 만료되어 로그아웃됩니다.' });
      }

      // Redis에 존재할 경우 Access token과 Refresh token 재발급
      console.log('Redis에 Refresh token 존재함. Access, Refresh 재발급');
      const newAccessToken = jwt.sign(
        {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          provider: req.user.provider,
        },
        process.env.JWT_ACCESS_SECRET_KEY,
        { expiresIn: '1m' }
      );
      const newRefreshToken = jwt.sign({ id: req.user.id }, process.env.JWT_REFRESH_SECRET_KEY, {
        expiresIn: '7d',
      });
      // refresh token 해싱
      const hashedNewRefreshToken = await hashValue(newRefreshToken);

      // 5. redis에 refresh token 저장
      await redisClient.set(req.user.id.toString(), hashedNewRefreshToken, {
        EX: 60 * 60 * 24 * 7,
      });

      // 6. Access token 전달 (Cookie)
      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 15 * 60 * 1000, // 10분 유효
      });
      return next(); // 재발급 후 컨트롤러로 이동
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Authentication middleware error' });
  }
};

module.exports = { authMiddleware };
