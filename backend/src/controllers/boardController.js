const { TeamBoard, User, BasketballTeamMember, Team } = require('../models/index.js');
const { BadRequestError, BadGatewayError, UnauthorizedError } = require('../errors/index.js');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const {
  getUserId,
  getDefaultTeamMember,
  sendSuccessResponse,
  createPagination,
} = require('../utils/controllerHelpers');

/**
 * @swagger
 * /team/boards:
 *   get:
 *     summary: 팀 게시판 목록 조회
 *     tags:
 *       - Board
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
 *         description: 페이지당 개수
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 검색어 (제목 + 내용)
 *     responses:
 *       200:
 *         description: 게시판 목록 조회 성공
 */
const getBoards = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { page = 1, limit = 20, search } = req.query;

    // 사용자의 기본 팀 조회
    const teamMember = await getDefaultTeamMember(userId);

    if (!teamMember) {
      return sendSuccessResponse(res, 200, [], null, createPagination(0, page, limit));
    }

    const teamId = teamMember.team.id;

    // 검색 조건
    const where = {
      team_id: teamId,
    };

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }

    // 게시글 조회 (공지사항 먼저, 그 다음 최신순)
    const offset = (page - 1) * limit;
    const { count, rows } = await TeamBoard.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
      order: [
        ['is_notice', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return sendSuccessResponse(res, 200, rows, null, createPagination(count, page, limit));
  } catch (err) {
    logger.error('게시판 목록 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`게시판 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}:
 *   get:
 *     summary: 게시글 상세 조회
 *     tags:
 *       - Board
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 상세 조회 성공
 */
const getBoard = async (req, res) => {
  try {
    getUserId(req); // 사용자 검증만 수행
    const { id } = req.params;

    const board = await TeamBoard.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!board) {
      throw new BadRequestError('게시글을 찾을 수 없습니다.');
    }

    // 조회수 증가
    await board.increment('view_count');

    return sendSuccessResponse(res, 200, {
      ...board.toJSON(),
      view_count: board.view_count + 1,
    });
  } catch (err) {
    logger.error('게시글 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`게시글 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards:
 *   post:
 *     summary: 게시글 작성
 *     tags:
 *       - Board
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               is_notice:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 게시글 작성 성공
 */
const createBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, content, is_notice = false } = req.body;

    if (!title || !content) {
      throw new BadRequestError('제목과 내용은 필수입니다.');
    }

    // 사용자의 기본 팀 조회
    const teamMember = await getDefaultTeamMember(userId);
    if (!teamMember) {
      throw new BadRequestError('가입된 팀이 없습니다.');
    }

    const teamId = teamMember.team.id;

    // 공지사항은 관리자만 작성 가능
    if (is_notice && !['manager', 'leader'].includes(teamMember.role)) {
      throw new UnauthorizedError('공지사항은 관리자만 작성할 수 있습니다.');
    }

    const board = await TeamBoard.create({
      team_id: teamId,
      user_id: userId,
      title,
      content,
      is_notice: is_notice ? 1 : 0,
    });

    return sendSuccessResponse(res, 200, board, '게시글이 작성되었습니다.');
  } catch (err) {
    logger.error('게시글 작성 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`게시글 작성 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}:
 *   put:
 *     summary: 게시글 수정
 *     tags:
 *       - Board
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               is_notice:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 게시글 수정 성공
 */
const updateBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, content, is_notice } = req.body;

    const board = await TeamBoard.findOne({ where: { id } });

    if (!board) {
      throw new BadRequestError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 본인 또는 관리자만 수정 가능
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        team_id: board.team_id,
        is_active: 1,
      },
    });

    if (!teamMember) {
      throw new UnauthorizedError('권한이 없습니다.');
    }

    const isAuthor = board.user_id === userId;
    const isAdmin = ['manager', 'leader'].includes(teamMember.role);

    if (!isAuthor && !isAdmin) {
      throw new UnauthorizedError('권한이 없습니다.');
    }

    // 공지사항 설정은 관리자만 가능
    if (is_notice !== undefined && is_notice !== board.is_notice && !isAdmin) {
      throw new UnauthorizedError('공지사항 설정은 관리자만 가능합니다.');
    }

    // 수정
    await board.update({
      title: title || board.title,
      content: content || board.content,
      is_notice: is_notice !== undefined ? (is_notice ? 1 : 0) : board.is_notice,
    });

    return sendSuccessResponse(res, 200, board, '게시글이 수정되었습니다.');
  } catch (err) {
    logger.error('게시글 수정 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`게시글 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}:
 *   delete:
 *     summary: 게시글 삭제
 *     tags:
 *       - Board
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 게시글 삭제 성공
 */
const deleteBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const board = await TeamBoard.findOne({ where: { id } });

    if (!board) {
      throw new BadRequestError('게시글을 찾을 수 없습니다.');
    }

    // 작성자 본인 또는 관리자만 삭제 가능
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        team_id: board.team_id,
        is_active: 1,
      },
    });

    if (!teamMember) {
      throw new UnauthorizedError('권한이 없습니다.');
    }

    const isAuthor = board.user_id === userId;
    const isAdmin = ['manager', 'leader'].includes(teamMember.role);

    if (!isAuthor && !isAdmin) {
      throw new UnauthorizedError('권한이 없습니다.');
    }

    // 소프트 삭제
    await board.destroy();

    return sendSuccessResponse(res, 200, null, '게시글이 삭제되었습니다.');
  } catch (err) {
    logger.error('게시글 삭제 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`게시글 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = {
  getBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
};
