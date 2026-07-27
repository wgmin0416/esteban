const { MemberRecruitment, User, Team, BasketballTeamMember, JoinRequest } = require('../models/index.js');
const { BadRequestError, UnauthorizedError, NotFoundError, BadGatewayError } = require('../errors/index.js');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getUserId, sendSuccessResponse, createPagination } = require('../utils/controllerHelpers');

/**
 * @swagger
 * /member-recruitments:
 *   get:
 *     summary: 팀원 모집 게시판 목록 조회
 *     tags: [MemberRecruitment]
 */
const getMemberRecruitments = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // 검색
    if (search) {
      where[Op.or] = [
        { position: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { team_intro: { [Op.like]: `%${search}%` } },
        { join_process: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await MemberRecruitment.findAndCountAll({
      where,
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'sports', 'logo_url'],
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return sendSuccessResponse(res, 200, { recruitments: rows }, null, createPagination(count, page, limit));
  } catch (err) {
    logger.error('팀원 모집 게시판 목록 조회 에러:', err);
    throw new BadGatewayError(`팀원 모집 게시판 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /member-recruitments/{id}:
 *   get:
 *     summary: 팀원 모집 게시글 상세 조회
 *     tags: [MemberRecruitment]
 */
const getMemberRecruitmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const recruitment = await MemberRecruitment.findByPk(id, {
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'sports', 'logo_url', 'intro', 'region'],
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!recruitment) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 현재 사용자가 이미 신청했는지 확인
    let hasApplied = false;
    if (userId) {
      const existingRequest = await JoinRequest.findOne({
        where: {
          team_id: recruitment.team_id,
          user_id: userId,
        },
      });
      hasApplied = !!existingRequest;
    }

    // 조회수 증가
    await recruitment.increment('view_count');

    const recruitmentData = recruitment.toJSON();
    recruitmentData.has_applied = hasApplied;

    return sendSuccessResponse(res, 200, recruitmentData);
  } catch (err) {
    logger.error('팀원 모집 게시글 조회 에러:', err);
    if (err instanceof NotFoundError) {
      throw err;
    }
    throw new BadGatewayError(`팀원 모집 게시글 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /member-recruitments/my-teams:
 *   get:
 *     summary: 글쓰기 가능한 팀 목록 조회 (leader/manager 권한)
 *     tags: [MemberRecruitment]
 */
const getMyTeamsForRecruitment = async (req, res) => {
  try {
    const userId = getUserId(req);

    // 사용자가 leader 또는 manager인 농구팀만 조회
    const teamMembers = await BasketballTeamMember.findAll({
      where: {
        user_id: userId,
        role: { [Op.in]: ['leader', 'manager'] },
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
          where: { sports: 'basketball' },
          attributes: ['id', 'name', 'logo_url'],
        },
      ],
    });

    const teams = teamMembers
      .filter((tm) => tm.team)
      .map((tm) => ({
        id: tm.team.id,
        name: tm.team.name,
        logo_url: tm.team.logo_url,
        role: tm.role,
      }));

    return sendSuccessResponse(res, 200, teams);
  } catch (err) {
    logger.error('글쓰기 가능한 팀 목록 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`팀 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /member-recruitments:
 *   post:
 *     summary: 팀원 모집 게시글 작성
 *     tags: [MemberRecruitment]
 */
const createMemberRecruitment = async (req, res) => {
  try {
    const userId = getUserId(req);

    // 디버깅: 전체 body 로깅
    logger.info('받은 전체 body:', JSON.stringify(req.body, null, 2));

    const { team_id, time, location, fee, position, is_competition, team_intro, join_process } =
      req.body;

    // 필수 항목 검증
    const missingFields = [];
    if (!team_id || team_id === '' || team_id === null || team_id === undefined) {
      missingFields.push('팀명');
    }
    if (!time || typeof time !== 'string' || !time.trim()) {
      missingFields.push('시간');
    }
    if (!location || typeof location !== 'string' || !location.trim()) {
      missingFields.push('장소');
    }
    if (fee === undefined || fee === null || fee === '') {
      missingFields.push('회비');
    }
    if (!position || typeof position !== 'string' || !position.trim()) {
      missingFields.push('포지션');
    }
    if (!team_intro || typeof team_intro !== 'string' || !team_intro.trim()) {
      missingFields.push('팀 소개');
    }
    if (!join_process || typeof join_process !== 'string' || !join_process.trim()) {
      missingFields.push('가입 절차 및 참고 사항');
    }

    if (missingFields.length > 0) {
      logger.error('필수 항목 누락:', { missingFields, receivedData: req.body });
      throw new BadRequestError(`필수 항목을 모두 입력해주세요: ${missingFields.join(', ')}`);
    }

    // 권한 확인: 해당 팀의 leader 또는 manager인지 확인
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        team_id: parseInt(team_id),
        role: { [Op.in]: ['leader', 'manager'] },
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
          where: { sports: 'basketball' },
        },
      ],
    });

    if (!teamMember || !teamMember.team) {
      throw new UnauthorizedError('해당 팀의 리더 또는 매니저만 글을 작성할 수 있습니다.');
    }

    const recruitment = await MemberRecruitment.create({
      team_id: parseInt(team_id),
      user_id: userId,
      time: time.trim(),
      location: location.trim(),
      fee: fee !== undefined && fee !== null && fee !== '' ? parseInt(fee) : 0,
      position: position.trim(),
      is_competition: is_competition ? 1 : 0,
      team_intro: team_intro.trim(),
      join_process: join_process.trim(),
    });

    return sendSuccessResponse(res, 201, recruitment, '팀원 모집 게시글이 작성되었습니다.');
  } catch (err) {
    logger.error('팀원 모집 게시글 작성 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`팀원 모집 게시글 작성 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /member-recruitments/{id}:
 *   put:
 *     summary: 팀원 모집 게시글 수정
 *     tags: [MemberRecruitment]
 */
const updateMemberRecruitment = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;
    const recruitment = await MemberRecruitment.findByPk(id);

    if (!recruitment) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (recruitment.user_id !== userId) {
      throw new UnauthorizedError('게시글을 수정할 권한이 없습니다.');
    }

    const { time, location, fee, position, is_competition, team_intro, join_process } = req.body;

    await recruitment.update({
      time: time !== undefined ? time.trim() : recruitment.time,
      location: location !== undefined ? location.trim() : recruitment.location,
      fee: fee !== undefined ? parseInt(fee) : recruitment.fee,
      position: position !== undefined ? position.trim() : recruitment.position,
      is_competition: is_competition !== undefined ? (is_competition ? 1 : 0) : recruitment.is_competition,
      team_intro: team_intro !== undefined ? team_intro.trim() : recruitment.team_intro,
      join_process: join_process !== undefined ? join_process.trim() : recruitment.join_process,
    });

    return sendSuccessResponse(res, 200, recruitment, '팀원 모집 게시글이 수정되었습니다.');
  } catch (err) {
    logger.error('팀원 모집 게시글 수정 에러:', err);
    if (err instanceof NotFoundError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`팀원 모집 게시글 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /member-recruitments/{id}:
 *   delete:
 *     summary: 팀원 모집 게시글 삭제
 *     tags: [MemberRecruitment]
 */
const deleteMemberRecruitment = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;
    const recruitment = await MemberRecruitment.findByPk(id);

    if (!recruitment) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (recruitment.user_id !== userId) {
      throw new UnauthorizedError('게시글을 삭제할 권한이 없습니다.');
    }

    await recruitment.destroy();

    return sendSuccessResponse(res, 200, null, '팀원 모집 게시글이 삭제되었습니다.');
  } catch (err) {
    logger.error('팀원 모집 게시글 삭제 에러:', err);
    if (err instanceof NotFoundError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`팀원 모집 게시글 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /member-recruitments/{id}/apply:
 *   post:
 *     summary: 팀 가입 신청
 *     tags: [MemberRecruitment]
 */
const applyToTeam = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;

    const recruitment = await MemberRecruitment.findByPk(id, {
      include: [
        {
          model: Team,
          as: 'team',
        },
      ],
    });

    if (!recruitment) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 이미 신청했는지 확인
    const existingRequest = await JoinRequest.findOne({
      where: {
        team_id: recruitment.team_id,
        user_id: userId,
      },
    });

    if (existingRequest) {
      throw new BadRequestError('이미 가입 신청한 팀입니다.');
    }

    // 이미 팀원인지 확인
    const existingMember = await BasketballTeamMember.findOne({
      where: {
        team_id: recruitment.team_id,
        user_id: userId,
        is_active: 1,
      },
    });

    if (existingMember) {
      throw new BadRequestError('이미 해당 팀의 멤버입니다.');
    }

    // 가입 신청 생성
    const joinRequest = await JoinRequest.create({
      team_id: recruitment.team_id,
      user_id: userId,
    });

    return sendSuccessResponse(res, 201, joinRequest, '가입 신청이 완료되었습니다.');
  } catch (err) {
    logger.error('팀 가입 신청 에러:', err);
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      throw err;
    }
    throw new BadGatewayError(`팀 가입 신청 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /member-recruitments/{id}/cancel:
 *   delete:
 *     summary: 팀 가입 신청 취소
 *     tags: [MemberRecruitment]
 */
const cancelTeamApplication = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;

    const recruitment = await MemberRecruitment.findByPk(id);
    if (!recruitment) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    const joinRequest = await JoinRequest.findOne({
      where: {
        team_id: recruitment.team_id,
        user_id: userId,
      },
    });

    if (!joinRequest) {
      throw new NotFoundError('가입 신청 내역을 찾을 수 없습니다.');
    }

    await joinRequest.destroy();

    return sendSuccessResponse(res, 200, null, '가입 신청이 취소되었습니다.');
  } catch (err) {
    logger.error('가입 신청 취소 에러:', err);
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      throw err;
    }
    throw new BadGatewayError(`가입 신청 취소 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = {
  getMemberRecruitments,
  getMemberRecruitmentById,
  getMyTeamsForRecruitment,
  createMemberRecruitment,
  updateMemberRecruitment,
  deleteMemberRecruitment,
  applyToTeam,
  cancelTeamApplication,
};
