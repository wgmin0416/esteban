const { BasketballTeamMember, Team } = require('../models/index.js');
const { BadRequestError } = require('../errors/index.js');

/**
 * 요청에서 사용자 ID를 추출하고 검증
 * @param {Object} req - Express request object
 * @returns {number} userId
 * @throws {BadRequestError} 사용자 정보가 없을 경우
 */
const getUserId = (req) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new BadRequestError('사용자 정보가 없습니다.');
  }
  return userId;
};

/**
 * 사용자의 기본 팀 조회
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Object|null>} teamMember with team 정보 또는 null
 */
const getDefaultTeamMember = async (userId) => {
  const teamMember = await BasketballTeamMember.findOne({
    where: {
      user_id: userId,
      is_default: 1,
      is_active: 1,
    },
    include: [{ model: Team, as: 'team' }],
  });

  return teamMember && teamMember.team ? teamMember : null;
};

/**
 * 사용자의 기본 팀 ID 조회
 * @param {number} userId - 사용자 ID
 * @returns {Promise<number|null>} teamId 또는 null
 * @throws {BadRequestError} 기본 팀이 없을 경우
 */
const getDefaultTeamId = async (userId) => {
  const teamMember = await getDefaultTeamMember(userId);
  if (!teamMember) {
    throw new BadRequestError('가입된 팀이 없습니다.');
  }
  return teamMember.team.id;
};

/**
 * 표준 성공 응답 생성
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (기본값: 200)
 * @param {*} data - 응답 데이터
 * @param {string} message - 응답 메시지 (선택)
 * @param {Object} pagination - 페이지네이션 정보 (선택)
 * @returns {Object} Express response
 */
const sendSuccessResponse = (res, statusCode = 200, data = null, message = null, pagination = null) => {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

/**
 * 페이지네이션 정보 생성
 * @param {number} count - 전체 개수
 * @param {number} page - 현재 페이지
 * @param {number} limit - 페이지당 개수
 * @returns {Object} 페이지네이션 정보
 */
const createPagination = (count, page, limit) => {
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count / limit),
  };
};

module.exports = {
  getUserId,
  getDefaultTeamMember,
  getDefaultTeamId,
  sendSuccessResponse,
  createPagination,
};
