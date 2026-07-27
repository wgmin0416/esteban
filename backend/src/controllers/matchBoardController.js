const { MatchBoard, User, MatchApplication } = require('../models/index.js');
const { BadRequestError, UnauthorizedError, NotFoundError, BadGatewayError } = require('../errors/index.js');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getUserId, sendSuccessResponse, createPagination } = require('../utils/controllerHelpers');

/**
 * @swagger
 * /match-boards:
 *   get:
 *     summary: 경기 모집 게시판 목록 조회
 *     tags: [MatchBoard]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 페이지당 게시글 수
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [team, guest, pickup]
 *         description: 모집 유형
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed, cancelled]
 *         description: 모집 상태
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 검색어 (팀명, 장소, 설명)
 */
const getMatchBoards = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status = 'open', search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // 타입 필터
    if (type) {
      where.type = type;
    }

    // 상태 필터
    if (status) {
      where.status = status;
    }

    // 검색
    if (search) {
      where[Op.or] = [
        { team_name: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await MatchBoard.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'profile_image'],
        },
      ],
      order: [['match_start_time', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return sendSuccessResponse(res, 200, { boards: rows }, null, createPagination(count, page, limit));
  } catch (err) {
    logger.error('경기 모집 게시판 목록 조회 에러:', err);
    throw new BadGatewayError(`경기 모집 게시판 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /match-boards/{id}:
 *   get:
 *     summary: 경기 모집 게시글 상세 조회
 *     tags: [MatchBoard]
 */
const getMatchBoardById = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await MatchBoard.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'profile_image'],
        },
      ],
    });

    if (!board) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 조회수 증가
    await board.increment('view_count');

    return sendSuccessResponse(res, 200, board);
  } catch (err) {
    logger.error('경기 모집 게시글 조회 에러:', err);
    if (err instanceof NotFoundError) {
      throw err;
    }
    throw new BadGatewayError(`경기 모집 게시글 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /match-boards:
 *   post:
 *     summary: 경기 모집 게시글 작성
 *     tags: [MatchBoard]
 */
const createMatchBoard = async (req, res) => {
  try {
    const userId = getUserId(req);

    const {
      type,
      team_name,
      match_start_time,
      match_end_time,
      location,
      cost,
      skill_level,
      game_format,
      uniform,
      has_parking,
      has_air_conditioning,
      has_shower,
      description,
    } = req.body;

    // 필수 항목 검증
    if (!type || !match_start_time || !match_end_time || !location) {
      throw new BadRequestError('필수 항목을 모두 입력해주세요.');
    }

    // 픽업이 아닌 경우 팀명 필수
    if (type !== 'pickup' && !team_name) {
      throw new BadRequestError('팀명을 입력해주세요.');
    }

    const board = await MatchBoard.create({
      user_id: userId,
      type,
      team_name,
      match_start_time,
      match_end_time,
      location,
      cost: cost || 0,
      skill_level,
      game_format,
      uniform,
      has_parking: has_parking ? 1 : 0,
      has_air_conditioning: has_air_conditioning ? 1 : 0,
      has_shower: has_shower ? 1 : 0,
      description,
      status: 'open',
    });

    return sendSuccessResponse(res, 201, board, '경기 모집 게시글이 작성되었습니다.');
  } catch (err) {
    logger.error('경기 모집 게시글 작성 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`경기 모집 게시글 작성 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /match-boards/{id}:
 *   put:
 *     summary: 경기 모집 게시글 수정
 *     tags: [MatchBoard]
 */
const updateMatchBoard = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;
    const board = await MatchBoard.findByPk(id);

    if (!board) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (board.user_id !== userId) {
      throw new UnauthorizedError('게시글을 수정할 권한이 없습니다.');
    }

    const {
      type,
      team_name,
      match_start_time,
      match_end_time,
      location,
      cost,
      skill_level,
      game_format,
      uniform,
      has_parking,
      has_air_conditioning,
      has_shower,
      description,
      status,
    } = req.body;

    await board.update({
      type: type || board.type,
      team_name,
      match_start_time: match_start_time || board.match_start_time,
      match_end_time: match_end_time || board.match_end_time,
      location: location || board.location,
      cost: cost !== undefined ? cost : board.cost,
      skill_level,
      game_format,
      uniform,
      has_parking: has_parking !== undefined ? (has_parking ? 1 : 0) : board.has_parking,
      has_air_conditioning: has_air_conditioning !== undefined ? (has_air_conditioning ? 1 : 0) : board.has_air_conditioning,
      has_shower: has_shower !== undefined ? (has_shower ? 1 : 0) : board.has_shower,
      description,
      status: status || board.status,
    });

    return sendSuccessResponse(res, 200, board, '경기 모집 게시글이 수정되었습니다.');
  } catch (err) {
    logger.error('경기 모집 게시글 수정 에러:', err);
    if (err instanceof NotFoundError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`경기 모집 게시글 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /match-boards/{id}:
 *   delete:
 *     summary: 경기 모집 게시글 삭제
 *     tags: [MatchBoard]
 */
const deleteMatchBoard = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;
    const board = await MatchBoard.findByPk(id);

    if (!board) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (board.user_id !== userId) {
      throw new UnauthorizedError('게시글을 삭제할 권한이 없습니다.');
    }

    await board.destroy();

    return sendSuccessResponse(res, 200, null, '경기 모집 게시글이 삭제되었습니다.');
  } catch (err) {
    logger.error('경기 모집 게시글 삭제 에러:', err);
    if (err instanceof NotFoundError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`경기 모집 게시글 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /match-boards/{id}/apply:
 *   post:
 *     summary: 경기 신청
 *     tags: [MatchBoard]
 */
const applyToMatch = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;
    const { message } = req.body;

    const board = await MatchBoard.findByPk(id);
    if (!board) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    if (board.status !== 'open') {
      throw new BadRequestError('모집이 마감되었습니다.');
    }

    // 이미 신청했는지 확인
    const existing = await MatchApplication.findOne({
      where: {
        match_board_id: id,
        user_id: userId,
      },
    });

    if (existing) {
      throw new BadRequestError('이미 신청한 게시글입니다.');
    }

    // 신청 생성
    const application = await MatchApplication.create({
      match_board_id: id,
      user_id: userId,
      message: message || '',
      status: 'approved', // 자동 승인
    });

    // 현재 참가 인원 증가
    await board.increment('current_participants');

    // 정원 채워졌는지 확인
    const updatedBoard = await board.reload();
    if (updatedBoard.current_participants >= updatedBoard.max_participants) {
      await board.update({ status: 'closed' });
    }

    return sendSuccessResponse(res, 201, application, '신청이 완료되었습니다.');
  } catch (err) {
    logger.error('경기 신청 에러:', err);
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      throw err;
    }
    throw new BadGatewayError(`경기 신청 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /match-boards/{id}/cancel:
 *   delete:
 *     summary: 경기 신청 취소
 *     tags: [MatchBoard]
 */
const cancelApplication = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { id } = req.params;

    const application = await MatchApplication.findOne({
      where: {
        match_board_id: id,
        user_id: userId,
      },
      include: [
        {
          model: MatchBoard,
          as: 'matchBoard',
        },
      ],
    });

    if (!application) {
      throw new NotFoundError('신청 내역을 찾을 수 없습니다.');
    }

    // 신청 삭제
    await application.destroy();

    // 현재 참가 인원 감소
    const board = application.matchBoard;
    await board.decrement('current_participants');

    // 마감이었다면 다시 open
    if (board.status === 'closed') {
      await board.update({ status: 'open' });
    }

    return sendSuccessResponse(res, 200, null, '신청이 취소되었습니다.');
  } catch (err) {
    logger.error('신청 취소 에러:', err);
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      throw err;
    }
    throw new BadGatewayError(`신청 취소 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = {
  getMatchBoards,
  getMatchBoardById,
  createMatchBoard,
  updateMatchBoard,
  deleteMatchBoard,
  applyToMatch,
  cancelApplication,
};
