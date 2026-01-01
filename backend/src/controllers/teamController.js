const { BadGatewayError, BadRequestError, ForbiddenError } = require('../errors/index.js');
const { User, Team, BasketballTeamMember, JoinRequest } = require('../models/index.js');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// 팀 생성
/**
 * @swagger
 * /team/create-team:
 *   post:
 *     summary: 팀 생성
 *     tags:
 *       - Team
 *     requestBody:
 *       description: |
 *         - name(팀명)
 *         - leader_id(팀 리더 회원 ID)
 *         - sports(종목)
 *         - leader_id(팀 리더 회원 ID)
 *         - intro(팀 소개)
 *         - leader_id(팀 리더 회원 ID)
 *         - logo_url(로고 이미지 URL)
 *         - region(주 활동 지역)
 *         - is_public(공개 여부)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - leader_id
 *               - sports
 *               - region
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dream Team
 *               leader_id:
 *                 type: integer
 *                 example: 1
 *               sports:
 *                 type: string
 *                 example: basketball
 *               intro:
 *                 type: string
 *                 example: "안녕하세요. Dream Team입니다."
 *               logo_url:
 *                 type: string
 *                 example: ""
 *               region:
 *                 type: string
 *                 example: 서울
 *               established_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-27T17:00:00Z"
 *               is_public:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: 팀 생성 성공 여부
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
const createTeam = async (req, res) => {
  try {
    const { name, leader_id, sports, intro, logo_url, region, established_at, is_public } =
      req.body;

    // 팀 정보 확인
    if (!leader_id) {
      throw new BadRequestError('리더 아이디가 존재하지 않습니다.');
    }
    if (!name || name.trim() === '') {
      throw new BadRequestError('팀명이 존재하지 않습니다.');
    }
    if (!sports) {
      throw new BadRequestError('종목이 존재하지 않습니다.');
    }
    if (!region || region.trim() === '') {
      throw new BadRequestError('주 활동 지역이 존재하지 않습니다.');
    }

    // 종목별 리더 팀 개수 체크 (최대 2개)
    const existingTeamsCount = await Team.count({
      where: {
        leader_id: parseInt(leader_id),
        sports,
      },
    });

    if (existingTeamsCount >= 2) {
      throw new BadRequestError('한 종목에서 최대 2개의 팀만 생성할 수 있습니다.');
    }

    // 생성할 팀 데이터
    const teamData = {
      name: name.trim(),
      leader_id: parseInt(leader_id),
      sports,
      region: region.trim(),
      intro: intro && intro.trim() !== '' ? intro.trim() : null,
      logo_url: logo_url && logo_url.trim() !== '' ? logo_url.trim() : null,
      established_at: established_at && established_at.trim() !== '' ? established_at : null,
      is_public: is_public !== undefined && is_public !== null ? parseInt(is_public) : 1,
    };

    // 팀 생성
    const newTeam = await Team.create(teamData);

    // 사용자가 해당 종목에서 기본 팀이 있는지 확인
    const hasDefaultTeam = await BasketballTeamMember.findOne({
      where: {
        user_id: leader_id,
        is_default: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
          where: { sports },
          attributes: ['id'],
        },
      ],
    });

    // 팀 멤버 생성 (기본 팀이 없으면 첫 번째 팀을 기본으로 설정)
    await BasketballTeamMember.create({
      team_id: newTeam.id,
      user_id: leader_id,
      role: 'leader',
      is_active: 1,
      is_default: hasDefaultTeam ? 0 : 1, // 기본 팀이 없으면 1, 있으면 0
    });

    return res.status(201).json({ success: true, data: newTeam });
  } catch (err) {
    logger.error('팀 생성 에러:', err);
    if (err instanceof BadRequestError || err instanceof BadGatewayError) {
      throw err;
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
      throw new BadRequestError(
        '이미 존재하는 팀명입니다. 같은 종목에 동일한 팀명을 사용할 수 없습니다.'
      );
    }
    if (err.name === 'SequelizeValidationError') {
      throw new BadRequestError(`유효성 검사 실패: ${err.message}`);
    }
    throw new BadGatewayError(`팀 생성 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 팀 정보 조회 (사용자가 속한 팀)
/**
 * @swagger
 * /team/info:
 *   get:
 *     summary: 사용자가 속한 팀 정보 조회
 *     tags:
 *       - Team
 *     responses:
 *       200:
 *         description: 팀 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     leader_id:
 *                       type: integer
 *                     sports:
 *                       type: string
 *                     intro:
 *                       type: string
 *                     logo_url:
 *                       type: string
 *                     region:
 *                       type: string
 *                     established_at:
 *                       type: string
 *                     is_public:
 *                       type: integer
 *                     boost_promoted_at:
 *                       type: string
 *                     booster_expired_at:
 *                       type: string
 */
const getTeamInfo = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    logger.info(`[팀 정보 조회] 사용자 ID: ${userId}`);

    // 사용자가 속한 팀 조회 (기본 팀 우선, BasketballTeamMember를 통해)
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
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
            'boost_promoted_at',
            'booster_expired_at',
          ],
        },
      ],
      order: [
        ['is_default', 'DESC'],
        ['created_at', 'ASC'],
      ], // 기본 팀 우선, 그 다음 생성일 순
    });

    logger.info(`[팀 정보 조회] teamMember: ${teamMember ? '존재' : '없음'}`);

    if (!teamMember || !teamMember.team) {
      logger.info(`[팀 정보 조회] 팀 정보 없음 - 사용자 ID: ${userId}`);
      return res.status(200).json({ success: true, data: null });
    }

    logger.info(`[팀 정보 조회] 팀 정보 조회 성공 - 팀 ID: ${teamMember.team.id}`);
    return res.status(200).json({ success: true, data: teamMember.team });
  } catch (err) {
    logger.error('팀 정보 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof BadGatewayError) {
      throw err;
    }
    throw new BadGatewayError(`팀 정보 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 기본 팀 설정
/**
 * @swagger
 * /team/set-default:
 *   post:
 *     summary: 기본 노출 팀 설정
 *     tags:
 *       - Team
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - team_id
 *             properties:
 *               team_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: 기본 팀 설정 성공
 */
const setDefaultTeam = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { team_id } = req.body;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    if (!team_id) {
      throw new BadRequestError('팀 ID가 필요합니다.');
    }

    // 해당 팀에 사용자가 속해있는지 확인
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        team_id: parseInt(team_id),
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
          team_id: { [Op.ne]: parseInt(team_id) },
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
          team_id: parseInt(team_id),
          is_active: 1,
        },
      }
    );

    return res.status(200).json({ success: true, message: '기본 팀이 설정되었습니다.' });
  } catch (err) {
    logger.error('기본 팀 설정 에러:', err);
    if (err instanceof BadRequestError || err instanceof BadGatewayError) {
      throw err;
    }
    throw new BadGatewayError(`기본 팀 설정 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 전체 회원 조회
/**
 * @swagger
 * /team/members:
 *   get:
 *     summary: 팀 전체 회원 조회
 *     tags:
 *       - Team
 *     responses:
 *       200:
 *         description: 팀 전체 회원 조회 성공 여부
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
const getMembers = async (req, res) => {
  try {
    // 검색조건
    const where = {};

    // 조회
    const members = await User.findAll({
      attributes: ['name', 'phone', 'gender'],
      include: [
        {
          model: BasketballTeamMember,
          as: 'team_members',
          raw: true,
          attributes: [
            'image_url',
            'intro',
            'role',
            'position',
            'uniform_number',
            'activity_score',
            'last_attended_at',
            'is_active',
          ],
        },
      ],
      where,
    });
    return res.status(200).json({ success: true, data: members });
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 회원 조회
const getMember = async (req, res) => {
  try {
    // 검색조건
    const where = { id: req.query.memberId };
    if (!req.query.memberId) {
      throw new BadRequestError('회원 번호를 입력해주세요.');
    }
    // 조회
    const member = User.findOne({ where });
    if (member) {
      return res.status(200).json({ success: true, data: members });
    } else {
      throw new BadRequestError('존재하지 않는 회원입니다.');
    }
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 팀 가입 신청
const requestMember = async (req, res) => {
  try {
    const userId = req.body.userId;
    const teamId = req.body.teamId;

    // 팀 조회
    const team = await Team.findOne({
      where: {
        team_id: teamId,
      },
    });

    if (!team) {
      throw new BadRequestError('존재하지 않는 팀입니다.');
    }

    await JoinRequest.create({
      user_id: userId,
      team_id: teamId,
    });

    res.status(200).json({
      success: true,
      message: '가입 신청되었습니다.',
    });
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 가입 신청 조회
const getJoinRequests = async (req, res) => {
  try {
    const teamId = req.query.teamId;
    const role = req.query.role;

    if (role !== 'leader') {
      throw new ForbiddenError();
    }

    const data = await JoinRequest.findAll({
      where: {
        team_id: teamId,
      },
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 팀 가입 승인
const createMember = async (req, res) => {
  try {
    const role = req.params.role;
    if (role !== 'leader') {
      throw new ForbiddenError();
    }
  } catch (err) {
    throw new BadGatewayError();
  }
};

module.exports = {
  createTeam,
  getTeamInfo,
  setDefaultTeam,
  getMembers,
  getMember,
  requestMember,
  getJoinRequests,
  createMember,
};
