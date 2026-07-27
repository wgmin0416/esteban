const { User, Team, BasketballTeamMember } = require('../models/index.js');
const { BadGatewayError, UnauthorizedError, BadRequestError } = require('../errors/index.js');
const { Op } = require('sequelize');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redisClient = require('../config/redisClient.js');
const config = require('../config/config.js');
const { maxAge, ...clearCookieOptions } = config.accessToken.cookieOptions;
const logger = require('../utils/logger.js');

// 소셜 로그인 클라이언트 판별 (state 접두사 "app." → 앱, 그 외 → 웹)
const resolveClientType = (state) =>
  typeof state === 'string' && state.startsWith('app.') ? 'app' : 'web';

const appRedirectScheme = () => process.env.APP_REDIRECT_SCHEME || 'com.esteban.app://auth';

// 소셜 신규가입 후 처리 (웹: /auth?message=join / 앱: 딥링크)
const finishSocialJoin = (res, state) => {
  if (resolveClientType(state) === 'app') {
    return res.redirect(`${appRedirectScheme()}?message=join`);
  }
  // 웹은 HashRouter → 해시 경로로 리다이렉트
  return res.redirect(`${process.env.FRONT_URL}/#/auth?message=join`);
};

// 소셜 로그인 완료 처리 (웹: 쿠키+/auth / 앱: 일회용 코드 딥링크)
const finishSocialLogin = async (res, user, state) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET_KEY,
    { expiresIn: '5m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_REFRESH_SECRET_KEY,
    { expiresIn: '7d' }
  );
  // refresh token은 서버(Redis)에만 보관 (앱/웹 공통)
  await redisClient.set(`${user.id}`, refreshToken, { EX: 60 * 60 * 24 * 7 });

  if (resolveClientType(state) === 'app') {
    // 앱: 토큰을 URL에 직접 싣지 않고 일회용 코드(otc, 60초)로 교환
    const otc = crypto.randomUUID();
    await redisClient.set(`otc:${otc}`, accessToken, { EX: 60 });
    logger.info(`LOGIN(app) ${user.id}`);
    return res.redirect(`${appRedirectScheme()}?otc=${otc}`);
  }

  // 웹: httpOnly 쿠키 + 해시 경로(/#/auth) 리다이렉트 (HashRouter)
  res.cookie('access_token', accessToken, config.accessToken.cookieOptions);
  logger.info(`LOGIN ${user.id}`);
  return res.redirect(`${process.env.FRONT_URL}/#/auth`);
};

// 앱: 일회용 코드(otc)를 access token으로 교환
const exchangeAppToken = async (req, res) => {
  const { otc } = req.body;
  if (!otc) {
    throw new BadRequestError('otc가 필요합니다.');
  }
  const accessToken = await redisClient.get(`otc:${otc}`);
  if (!accessToken) {
    throw new UnauthorizedError();
  }
  await redisClient.del(`otc:${otc}`); // 1회용 → 즉시 삭제
  return res.status(200).json({ success: true, access_token: accessToken });
};

// 개발용 테스트 계정 로그인 (OAuth 없이 실제 세션 발급)
// .env 의 DEV_LOGIN_ENABLED=true 일 때만 동작. 배포 시 반드시 끌 것.
const devLogin = async (req, res) => {
  if (process.env.DEV_LOGIN_ENABLED !== 'true') {
    throw new UnauthorizedError();
  }

  // 테스트 계정이 없으면 생성 (developer 권한)
  const [user] = await User.findOrCreate({
    where: { provider: 'dev', provider_id: 'test-account' },
    defaults: {
      name: '테스트유저',
      email: 'test@esteban.dev',
      role: 'developer',
      provider: 'dev',
      provider_id: 'test-account',
    },
  });

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET_KEY,
    { expiresIn: '5m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_REFRESH_SECRET_KEY,
    { expiresIn: '7d' }
  );
  await redisClient.set(`${user.id}`, refreshToken, { EX: 60 * 60 * 24 * 7 });

  // 웹: httpOnly 쿠키 / 앱: 응답 바디의 access_token 사용
  res.cookie('access_token', accessToken, config.accessToken.cookieOptions);
  logger.info(`DEV LOGIN ${user.id}`);
  return res.status(200).json({ success: true, access_token: accessToken });
};

// 구글 로그인 콜백 처리
const googleLoginCallback = async (req, res) => {
  // 1. Authorization Code로 Access Token 요청
  // 2. Access token으로 사용자 정보 요청
  // 3. 사용자 DB 조회
  // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
  // 4-2. 등록 된 사용자일 경우 token 발급

  const { code, state } = req.query; // Authorization Code
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
      finishSocialJoin(res, state);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급 (웹=쿠키/앱=딥링크 분기)
      await finishSocialLogin(res, user, state);
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
      finishSocialJoin(res, state);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급 (웹=쿠키/앱=딥링크 분기)
      await finishSocialLogin(res, user, state);
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

  const { code, state } = req.query;
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
      finishSocialJoin(res, state);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급 (웹=쿠키/앱=딥링크 분기)
      await finishSocialLogin(res, user, state);
    }
  } catch (err) {
    throw new BadGatewayError('Kakao 로그인 중 오류가 발생했습니다.');
  }
};

/**
 * @swagger
 * /user/admin-login:
 *   post:
 *     summary: 관리자 로그인
 *     tags:
 *       - User
 *     requestBody:
 *       description: |
 *         - id(아이디)
 *         - password(비밀번호)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - password
 *             properties:
 *               id:
 *                 type: string
 *                 example: estbadmin
 *               password:
 *                 type: string
 *                 example: estb2009
 *     responses:
 *       200:
 *         description: 관리자 로그인 성공 여부
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 access_token:
 *                   type: string
 */
// 관리자 로그인
const adminLogin = async (req, res) => {
  const adminId = req.body.id;
  const adminPassword = req.body.password;

  if (adminId !== process.env.ADMIN_ID) {
    throw new BadRequestError('잘못된 관리자 아이디입니다.');
  }
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new BadRequestError('잘못된 관리자 비밀번호입니다.');
  }

  // 3. 사용자 DB 조회
  const user = await User.findOne({
    attributes: ['id', 'role'],
    where: {
      provider: adminId,
    },
  });

  if (!user) {
    throw new BadRequestError('관리자 계정이 없습니다.');
  } else {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_ACCESS_SECRET_KEY,
      {
        expiresIn: '5m',
      }
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET_KEY,
      {
        expiresIn: '7d',
      }
    );

    // 5. redis에 refresh token 저장
    await redisClient.set(`${user.id}`, refreshToken, {
      EX: 60 * 60 * 24 * 7,
    });

    // 6. Access token 전달 (Cookie)
    res.status(200).json({
      success: true,
      message: '관리자 계정 로그인 되었습니다.',
      access_token: accessToken,
    });
  }
};

// 로그아웃
const logout = async (req, res) => {
  // Redis key값 제거
  // 앱: Authorization Bearer / 웹: Cookie access_token
  const authHeader = req.headers.authorization;
  const token =
    authHeader && /^Bearer\s+/i.test(authHeader)
      ? authHeader.replace(/^Bearer\s+/i, '')
      : req.cookies.access_token;
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

// Access Token 재발급
const refreshAccessToken = async (req, res) => {
  try {
    // 앱: Authorization Bearer / 웹: httpOnly 쿠키
    const authHeader = req.headers.authorization;
    const usedBearer = !!(authHeader && /^Bearer\s+/i.test(authHeader));
    const token = usedBearer
      ? authHeader.replace(/^Bearer\s+/i, '')
      : req.cookies.access_token;

    if (!token) {
      logger.error('Access token was not found (refresh)');
      throw new UnauthorizedError();
    }

    // 만료된 토큰이라도 payload를 읽기 위해 verify 대신 decode 사용
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.id) {
      logger.error("Failed to decode JWT on refresh or missing 'id' field");
      throw new UnauthorizedError();
    }

    const userId = decoded.id;

    // Redis에 저장된 refresh token 조회
    const storedRefreshToken = await redisClient.get(`${userId}`);

    if (!storedRefreshToken) {
      logger.error(`No refresh token found in Redis for user ${userId}`);
      throw new UnauthorizedError();
    }

    // refresh token 유효성 검증
    try {
      jwt.verify(storedRefreshToken, config.refreshToken.secret);
    } catch (err) {
      logger.error(`Invalid refresh token for user ${userId}: ${err.message}`);
      // 만료/오류 시 Redis 정리
      await redisClient.del(`${userId}`);
      throw new UnauthorizedError();
    }

    // 새 access token 발급
    const newAccessToken = jwt.sign(
      { id: userId, role: decoded.role },
      config.accessToken.secret,
      {
        expiresIn: config.accessToken.expiresIn,
      }
    );

    // 새 access token 전달: 앱=응답 바디 / 웹=쿠키
    if (usedBearer) {
      logger.info(`REFRESH(app) ${userId}`);
      return res.status(200).json({ success: true, access_token: newAccessToken });
    }
    res.cookie('access_token', newAccessToken, config.accessToken.cookieOptions);
    logger.info(`REFRESH ${userId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    logger.error(`Access token refresh error: ${err.message}`);
    throw new BadGatewayError(`토큰 재발급 중 오류가 발생했습니다: ${err.message}`);
  }
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

  const user = await User.findOne({
    where: {
      id: decoded.id,
    },
    include: [
      {
        model: Team,
        as: 'teams',
      },
      {
        model: BasketballTeamMember,
        as: 'team_members',
      },
    ],
  });
  if (!user) {
    throw new UnauthorizedError();
  }
  res.status(200).json({ success: true, data: user.dataValues });
};

// 내 정보 수정
/**
 * @swagger
 * /user/update:
 *   put:
 *     summary: 내 정보 수정
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               default_team_id:
 *                 type: integer
 *                 description: 기본 노출 팀 ID
 *     responses:
 *       200:
 *         description: 내 정보 수정 성공
 */
const updateMyInfo = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { email, phone, gender, is_marketing_agreed, default_team_id } = req.body;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    const updateData = {};

    // 이메일 수정
    if (email !== undefined) {
      updateData.email = email && email.trim() !== '' ? email.trim() : null;
    }

    // 전화번호 수정
    if (phone !== undefined) {
      updateData.phone = phone && phone.trim() !== '' ? phone.trim() : null;
    }

    // 성별 수정
    if (gender !== undefined) {
      if (gender === '' || gender === null) {
        updateData.gender = null;
      } else if (gender === 'male' || gender === 'female') {
        updateData.gender = gender;
      } else {
        throw new BadRequestError('성별은 male 또는 female만 가능합니다.');
      }
    }

    // 마케팅 수신 동의 수정
    if (is_marketing_agreed !== undefined) {
      updateData.is_marketing_agreed =
        is_marketing_agreed === 1 || is_marketing_agreed === true ? 1 : 0;
    }

    // 사용자 정보 업데이트
    if (Object.keys(updateData).length > 0) {
      await User.update(updateData, {
        where: { id: userId },
      });
    }

    // 기본 팀 설정
    if (default_team_id !== undefined) {
      // 해당 팀에 사용자가 속해있는지 확인
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          team_id: parseInt(default_team_id),
          is_active: 1,
        },
      });

      if (!teamMember) {
        throw new BadRequestError('해당 팀의 멤버가 아닙니다.');
      }

      // 같은 user_id의 다른 팀들의 is_default를 0으로 설정
      await BasketballTeamMember.update(
        { is_default: 0 },
        {
          where: {
            user_id: userId,
            team_id: { [Op.ne]: parseInt(default_team_id) },
            is_active: 1,
          },
        }
      );

      // 선택한 팀의 is_default를 1로 설정
      await BasketballTeamMember.update(
        { is_default: 1 },
        {
          where: {
            user_id: userId,
            team_id: parseInt(default_team_id),
            is_active: 1,
          },
        }
      );
    }

    // 업데이트된 사용자 정보 조회
    const updatedUser = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Team,
          as: 'teams',
        },
        {
          model: BasketballTeamMember,
          as: 'team_members',
        },
      ],
    });

    return res.status(200).json({ success: true, data: updatedUser.dataValues });
  } catch (err) {
    logger.error('내 정보 수정 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`내 정보 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 내가 속한 팀 목록 조회
/**
 * @swagger
 * /user/my-teams:
 *   get:
 *     summary: 내가 속한 팀 목록 조회
 *     tags:
 *       - User
 *     responses:
 *       200:
 *         description: 팀 목록 조회 성공
 */
const getMyTeams = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 사용자가 속한 팀 목록 조회
    const teamMembers = await BasketballTeamMember.findAll({
      where: {
        user_id: userId,
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
          attributes: [
            'id',
            'name',
            'leader_id',
            'sports',
            'intro',
            'logo_url',
            'region',
            'established_at',
            'is_public',
          ],
        },
      ],
      order: [
        ['is_default', 'DESC'],
        ['created_at', 'ASC'],
      ],
    });

    const teams = teamMembers.map((tm) => ({
      ...tm.team.dataValues,
      role: tm.role,
      is_default: tm.is_default,
    }));

    return res.status(200).json({ success: true, data: teams });
  } catch (err) {
    logger.error('내 팀 목록 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`내 팀 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = {
  googleLoginCallback,
  naverLoginCallback,
  kakaoLoginCallback,
  exchangeAppToken,
  devLogin,
  adminLogin,
  logout,
  myInfo,
  updateMyInfo,
  getMyTeams,
  refreshAccessToken,
};
