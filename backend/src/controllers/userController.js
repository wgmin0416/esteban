const { User } = require('../models/index.js');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient.js');
const config = require('../config/config.js');
const { maxAge, ...clearCookieOptions } = config.accessToken.cookieOptions;
const { BadGatewayError, UnauthorizedError } = require('../errors');
const logger = require('../utils/logger.js');

// 구글 로그인 콜백 처리
const googleLoginCallback = async (req, res) => {
  // 1. Authorization Code로 Access Token 요청
  // 2. Access token으로 사용자 정보 요청
  // 3. 사용자 DB 조회
  // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
  // 4-2. 등록 된 사용자일 경우 token 발급

  const code = req.query.code; // Authorization Code
  try {
    // 1. Authorization Code로 Access Token 요청
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      },
    });

    // Access token
    const { access_token } = tokenRes.data;

    // 2. Access token으로 사용자 정보 요청
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // 사용자 정보
    const { id, email, name } = userRes.data;

    // 3. 사용자 DB 조회
    const user = await User.findOne({
      where: {
        provider: 'google',
        provider_id: id,
      },
    });

    if (!user) {
      // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
      const createdUser = await User.create({
        name,
        email,
        provider: 'google',
        provider_id: id,
      });
      logger.info(`JOIN ${createdUser.id}`);
      res.redirect(`${process.env.FRONT_URL}/auth?message=join`);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급
      const accessToken = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_SECRET_KEY, {
        expiresIn: '5m',
      });
      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET_KEY, {
        expiresIn: '7d',
      });

      // 5. redis에 refresh token 저장
      await redisClient.set(`${user.id}`, refreshToken, {
        EX: 60 * 60 * 24 * 7,
      });

      // 6. Access token 전달 (Cookie)
      res.cookie('access_token', accessToken, config.accessToken.cookieOptions);

      logger.info(`LOGIN ${user.id}`);
      res.redirect(`${process.env.FRONT_URL}/auth`);
    }
  } catch (err) {
    throw new BadGatewayError('Google 로그인 중 오류가 발생했습니다.');
  }
};

const naverLoginCallback = async (req, res) => {
  // 1. Authorization Code로 Access Token 요청
  // 2. Access token으로 사용자 정보 요청
  // 3. 사용자 DB 조회
  // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
  // 4-2. 등록 된 사용자일 경우 token 발급

  const { code, state } = req.query;
  try {
    // 1. Authorization Code로 Access Token 요청
    const tokenRes = await axios.get('https://nid.naver.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID,
        client_secret: process.env.NAVER_CLIENT_SECRET,
        code,
        state,
      },
    });

    const accessToken = tokenRes.data.access_token;
    /// 2. Access token으로 사용자 정보 요청
    const userRes = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const { id, email, name } = userRes.data.response;

    // 3. 사용자 DB 조회
    const user = await User.findOne({
      where: {
        provider: 'naver',
        provider_id: id,
      },
    });

    if (!user) {
      // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
      const createdUser = await User.create({
        name,
        email,
        provider: 'naver',
        provider_id: id,
      });
      logger.info(`JOIN ${createdUser.id}`);
      res.redirect(`${process.env.FRONT_URL}/auth?message=join`);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급
      const accessToken = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_SECRET_KEY, {
        expiresIn: '5m',
      });
      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET_KEY, {
        expiresIn: '7d',
      });

      // 5. redis에 refresh token 저장
      await redisClient.set(`${user.id}`, refreshToken, {
        EX: 60 * 60 * 24 * 7,
      });

      // 6. Access token 전달 (Cookie)
      res.cookie('access_token', accessToken, config.accessToken.cookieOptions);

      logger.info(`LOGIN ${user.id}`);
      res.redirect(`${process.env.FRONT_URL}/auth`);
    }
  } catch (err) {
    throw new BadGatewayError('Naver 로그인 중 오류가 발생했습니다.');
  }
};

const kakaoLoginCallback = async (req, res) => {
  // 1. Authorization Code로 Access Token 요청
  // 2. Access token으로 사용자 정보 요청
  // 3. 사용자 DB 조회
  // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
  // 4-2. 등록 된 사용자일 경우 token 발급

  const { code } = req.query;
  try {
    // 1. Authorization Code로 Access Token 요청
    const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY,
        redirect_uri: process.env.KAKAO_REDIRECT_URL,
        client_secret: process.env.KAKAO_CLIENT_SECRET,
        code,
      },
    });

    const accessToken = tokenRes.data.access_token;
    /// 2. Access token으로 사용자 정보 요청
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const id = userRes.data.id;
    const name = userRes.data.properties.nickname;
    const email = userRes.data.properties.email ?? null;

    // 3. 사용자 DB 조회
    const user = await User.findOne({
      where: {
        provider: 'kakao',
        provider_id: id,
      },
    });

    if (!user) {
      // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
      const createdUser = await User.create({
        name,
        email,
        provider: 'kakao',
        provider_id: id,
      });
      logger.info(`JOIN ${createdUser.id}`);
      res.redirect(`${process.env.FRONT_URL}/auth?message=join`);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급
      const accessToken = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_SECRET_KEY, {
        expiresIn: '5m',
      });
      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET_KEY, {
        expiresIn: '7d',
      });

      // 5. redis에 refresh token 저장
      await redisClient.set(`${user.id}`, refreshToken, {
        EX: 60 * 60 * 24 * 7,
      });

      // 6. Access token 전달 (Cookie)
      res.cookie('access_token', accessToken, config.accessToken.cookieOptions);

      logger.info(`LOGIN ${user.id}`);
      res.redirect(`${process.env.FRONT_URL}/auth`);
    }
  } catch (err) {
    throw new BadGatewayError('Kakao 로그인 중 오류가 발생했습니다.');
  }
};

// 로그아웃
const logout = async (req, res) => {
  // Redis key값 제거
  // Cookie access_token 제거
  const token = req.cookies.access_token; // F/E Cookie access_token
  if (token) {
    const decoded = jwt.decode(token); // access_token parsing
    if (decoded && decoded.id) {
      const exists = await redisClient.exists(`${decoded.id}`); // Redis key check
      if (exists) {
        // Redis key값 제거
        await redisClient.del(`${decoded.id}`);
      }
    }
  }
  // Cookie access_token 제거
  res.clearCookie('access_token', clearCookieOptions);
  res.status(200).json({ success: true, message: '로그아웃 되었습니다.' });
};

// 내 정보 조회
const myInfo = async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) {
    logger.error('Access token was not found in cookie');
    throw new UnauthorizedError();
  }

  const decoded = jwt.decode(token);
  if (!decoded || !decoded.id) {
    logger.error("Failed to decode JWT or Decoded JWT is missing 'id' field");
    throw new UnauthorizedError();
  }

  const user = await User.findOne({ where: { id: decoded.id } });
  if (!user) {
    throw new UnauthorizedError();
  }
  res.status(200).json({ success: true, data: user.dataValues });
};

module.exports = {
  googleLoginCallback,
  naverLoginCallback,
  kakaoLoginCallback,
  logout,
  myInfo,
};
