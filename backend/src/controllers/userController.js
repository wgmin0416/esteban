const { User, Team, BasketballTeamMember } = require('../models/index.js');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient.js');
const config = require('../config/config.js');
const { maxAge, ...clearCookieOptions } = config.accessToken.cookieOptions;
const { BadGatewayError, UnauthorizedError, BadRequestError } = require('../errors');
const { Op } = require('sequelize');
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
      res.cookie('access_token', accessToken, config.accessToken.cookieOptions);

      logger.info(`LOGIN ${user.id}`);
      res.redirect(`${process.env.FRONT_URL}/auth`);
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
    const { email, phone, default_team_id } = req.body;

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
  adminLogin,
  logout,
  myInfo,
  updateMyInfo,
  getMyTeams,
};
