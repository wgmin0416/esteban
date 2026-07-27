const { CourtBoard, User } = require('../models/index.js');
const { BadRequestError, UnauthorizedError, NotFoundError, BadGatewayError } = require('../errors/index.js');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getUserId, sendSuccessResponse, createPagination } = require('../utils/controllerHelpers');

/**
 * 코트 대관/양도 게시판 목록 조회
 */
const getCourtBoards = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, region, date, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // 타입 필터 (대관, 양도) - 배열로 받아서 OR 조건
    if (type) {
      const types = Array.isArray(type) ? type : [type];
      where.type = { [Op.in]: types };
    }

    // 지역 필터
    if (region && region !== '전체') {
      where.region = region;
    }

    // 날짜 필터
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.court_date = {
        [Op.between]: [startDate, endDate],
      };
    }

    // 검색 (제목, 내용, 작성자명)
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await CourtBoard.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
      order: [['court_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return sendSuccessResponse(res, 200, { boards: rows }, null, createPagination(count, page, limit));
  } catch (err) {
    logger.error('코트 대관/양도 게시판 목록 조회 에러:', err);
    throw new BadGatewayError(`코트 대관/양도 게시판 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * 코트 대관/양도 게시글 상세 조회
 */
const getCourtBoardById = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await CourtBoard.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!board) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 조회수 증가
    await board.increment('view_count');

    return sendSuccessResponse(res, 200, { board });
  } catch (err) {
    logger.error('코트 대관/양도 게시글 조회 에러:', err);
    if (err instanceof NotFoundError) {
      throw err;
    }
    throw new BadGatewayError(`코트 대관/양도 게시글 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * 코트 대관/양도 게시글 작성
 */
const createCourtBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      type,
      title,
      content,
      court_date,
      location,
      region,
      cost,
      contact,
      court_size,
      court_image,
      has_parking,
      has_shower,
    } = req.body;

    // 필수 항목 검증 (cost는 -1일 수 있으므로 체크 제외)
    if (!type || !title || !court_date || !location || !region || (cost === undefined || cost === null || cost === '') || !contact || !court_size) {
      throw new BadRequestError('필수 항목을 모두 입력해주세요: 유형, 제목, 일시, 장소, 지역, 비용, 연락처, 코트 사이즈');
    }

    // 타입 검증
    if (!['대관', '양도'].includes(type)) {
      throw new BadRequestError('유형은 "대관" 또는 "양도"만 가능합니다.');
    }

    // cost 처리: -1이면 -1, 아니면 정수로 변환
    const costValue = cost === -1 || cost === '-1' ? -1 : parseInt(cost) || 0;

    const board = await CourtBoard.create({
      user_id: userId,
      type,
      title,
      content: content || '',
      court_date: new Date(court_date),
      location,
      region,
      cost: costValue,
      contact,
      court_size,
      court_image: court_image || null,
      has_parking: has_parking ? 1 : 0,
      has_shower: has_shower ? 1 : 0,
    });

    return sendSuccessResponse(res, 201, { board }, '게시글이 작성되었습니다.');
  } catch (err) {
    logger.error('코트 대관/양도 게시글 작성 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`코트 대관/양도 게시글 작성 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * 코트 대관/양도 게시글 수정
 */
const updateCourtBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const {
      type,
      title,
      content,
      court_date,
      location,
      region,
      cost,
      contact,
      court_size,
      court_image,
      has_parking,
      has_shower,
    } = req.body;

    const board = await CourtBoard.findByPk(id);

    if (!board) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (board.user_id !== userId) {
      throw new UnauthorizedError('수정 권한이 없습니다.');
    }

    // 필수 항목 검증 (cost는 -1일 수 있으므로 체크 제외)
    if (!type || !title || !court_date || !location || !region || (cost === undefined || cost === null || cost === '') || !contact || !court_size) {
      throw new BadRequestError('필수 항목을 모두 입력해주세요: 유형, 제목, 일시, 장소, 지역, 비용, 연락처, 코트 사이즈');
    }

    // 타입 검증
    if (!['대관', '양도'].includes(type)) {
      throw new BadRequestError('유형은 "대관" 또는 "양도"만 가능합니다.');
    }

    // cost 처리: -1이면 -1, 아니면 정수로 변환
    const costValue = cost === -1 || cost === '-1' ? -1 : parseInt(cost) || 0;

    await board.update({
      type,
      title,
      content: content || '',
      court_date: new Date(court_date),
      location,
      region,
      cost: costValue,
      contact,
      court_size,
      court_image: court_image || null,
      has_parking: has_parking ? 1 : 0,
      has_shower: has_shower ? 1 : 0,
    });

    return sendSuccessResponse(res, 200, { board }, '게시글이 수정되었습니다.');
  } catch (err) {
    logger.error('코트 대관/양도 게시글 수정 에러:', err);
    if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`코트 대관/양도 게시글 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * 코트 대관/양도 게시글 삭제
 */
const deleteCourtBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const board = await CourtBoard.findByPk(id);

    if (!board) {
      throw new NotFoundError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (board.user_id !== userId) {
      throw new UnauthorizedError('삭제 권한이 없습니다.');
    }

    await board.destroy();

    return sendSuccessResponse(res, 200, null, '게시글이 삭제되었습니다.');
  } catch (err) {
    logger.error('코트 대관/양도 게시글 삭제 에러:', err);
    if (err instanceof NotFoundError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`코트 대관/양도 게시글 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = {
  getCourtBoards,
  getCourtBoardById,
  createCourtBoard,
  updateCourtBoard,
  deleteCourtBoard,
};
