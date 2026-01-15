require('dotenv').config();

const config = {
  server: {
    frontendUrl: process.env.FRONT_URL,
    port: process.env.PORT || 3000,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    },
    naver: {
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      redirectUri: process.env.NAVER_REDIRECT_URL,
    },
    kakao: {
      restApiKey: process.env.KAKAO_REST_API_KEY,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      redirectUri: process.env.KAKAO_REDIRECT_URL,
    },
  },
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET_KEY,
    expiresIn: '5m',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false, // 개발 환경에서 http 허용
      sameSite: 'lax',
      maxAge: 1000 * 60 * 5, // 5분
      path: '/',
    },
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET_KEY,
    expiresIn: '7d',
    redisExpiry: 60 * 60 * 24 * 7, // 7일
  },
};

module.exports = config;
