const {
  TeamBoard,
  TeamBoardComment,
  User,
  BasketballTeamMember,
  BasketballMatch,
} = require('../models/index.js');
const { BadRequestError, BadGatewayError, UnauthorizedError } = require('../errors/index.js');
const { Op, fn, col } = require('sequelize');
const logger = require('../utils/logger');
const {
  getUserId,
  getDefaultTeamMember,
  sendSuccessResponse,
  createPagination,
} = require('../utils/controllerHelpers');

const CATEGORIES = ['공지', '자유', '후기', '질문', '건의'];
const ADMIN_ROLES = ['manager', 'leader'];
const TITLE_MAX = 100;

// 작성자의 팀 내 역할 뱃지 조회 (leader/manager만 의미)
const getRoleMap = async (teamId, userIds) => {
  if (!userIds.length) return {};
  const members = await BasketballTeamMember.findAll({
    where: { team_id: teamId, user_id: { [Op.in]: userIds } },
    attributes: ['user_id', 'role', 'image_url'],
  });
  const map = {};
  for (const m of members) map[m.user_id] = { role: m.role, image: m.image_url };
  return map;
};

// 반응 집계 → [{emoji, count, mine}]
const summarizeReactions = (reactions, userId) => {
  const r = reactions || {};
  return Object.keys(r).map((emoji) => ({
    emoji,
    count: Array.isArray(r[emoji]) ? r[emoji].length : 0,
    mine: Array.isArray(r[emoji]) && r[emoji].includes(userId),
  }));
};

// 투표 집계 (옵션별 표수 + 내 선택)
// 결과는 투표한 사람 · 운영진 · 리더만 볼 수 있음. 익명이 아니면 옵션별 투표자 이름 포함.
const buildPollSummary = async (poll, userId, viewerIsAdmin) => {
  if (!poll || !Array.isArray(poll.options)) return null;
  const votes = poll.votes || {};
  const myVotes = votes[userId] || [];
  const hasVoted = myVotes.length > 0;
  const canViewResults = !!viewerIsAdmin || hasVoted;
  const anonymous = !!poll.anonymous;

  const base = {
    question: poll.question || '',
    allowMulti: !!poll.allowMulti,
    anonymous,
    myVotes,
    canViewResults,
  };

  // 결과 열람 권한 없으면 옵션 텍스트만 반환 (표수/참여자 숨김)
  if (!canViewResults) {
    return { ...base, options: poll.options.map((o) => ({ id: o.id, text: o.text })) };
  }

  const counts = {};
  const votersByOpt = {};
  let total = 0;
  for (const uid of Object.keys(votes)) {
    for (const optId of votes[uid] || []) {
      counts[optId] = (counts[optId] || 0) + 1;
      total += 1;
      (votersByOpt[optId] = votersByOpt[optId] || []).push(Number(uid));
    }
  }

  // 익명이 아니면 투표자 이름 조회
  let nameMap = {};
  if (!anonymous) {
    const ids = Object.keys(votes).map(Number);
    if (ids.length) {
      const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'name'] });
      for (const u of users) nameMap[u.id] = u.name;
    }
  }

  return {
    ...base,
    totalVotes: total,
    voterCount: Object.keys(votes).length,
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      count: counts[o.id] || 0,
      ...(anonymous
        ? {}
        : { voters: (votersByOpt[o.id] || []).map((uid) => ({ id: uid, name: nameMap[uid] || `#${uid}` })) }),
    })),
  };
};

/**
 * @swagger
 * /team/boards:
 *   get:
 *     summary: 팀 게시판 목록 조회
 *     tags: [Board]
 */
const getBoards = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { page = 1, limit = 20, search, category } = req.query;

    const teamMember = await getDefaultTeamMember(userId);
    if (!teamMember) {
      return sendSuccessResponse(res, 200, [], null, createPagination(0, page, limit));
    }
    const teamId = teamMember.team.id;

    const where = { team_id: teamId };
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }
    if (category && CATEGORIES.includes(category)) {
      where.category = category;
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await TeamBoard.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        { model: BasketballMatch, as: 'match', attributes: ['id', 'title', 'match_date'] },
      ],
      order: [
        ['is_notice', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // 댓글 수 집계
    const boardIds = rows.map((b) => b.id);
    const commentCounts = {};
    if (boardIds.length) {
      const grouped = await TeamBoardComment.findAll({
        where: { board_id: { [Op.in]: boardIds } },
        attributes: ['board_id', [fn('COUNT', col('id')), 'cnt']],
        group: ['board_id'],
        raw: true,
      });
      for (const g of grouped) commentCounts[g.board_id] = parseInt(g.cnt);
    }

    const roleMap = await getRoleMap(teamId, rows.map((b) => b.user_id));

    const data = rows.map((b) => {
      const j = b.toJSON();
      const reactionCount = Object.values(j.reactions || {}).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      return {
        id: j.id,
        category: j.category,
        title: j.title,
        content: j.content,
        is_notice: j.is_notice,
        is_edited: j.is_edited,
        created_at: j.created_at,
        view_count: j.view_count,
        author: j.author,
        authorRole: roleMap[j.user_id]?.role || 'member',
        match: j.match || null,
        commentCount: commentCounts[j.id] || 0,
        reactionCount,
        attachmentCount: Array.isArray(j.attachments) ? j.attachments.length : 0,
        hasPoll: !!(j.poll && Array.isArray(j.poll.options) && j.poll.options.length),
        pinned_home: j.pinned_home,
      };
    });

    return sendSuccessResponse(res, 200, data, null, createPagination(count, page, limit));
  } catch (err) {
    logger.error('게시판 목록 조회 에러:', err);
    if (err instanceof BadRequestError) throw err;
    throw new BadGatewayError(`게시판 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}:
 *   get:
 *     summary: 게시글 상세 조회
 *     tags: [Board]
 */
const getBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const board = await TeamBoard.findOne({
      where: { id },
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        { model: BasketballMatch, as: 'match', attributes: ['id', 'title', 'match_date', 'status'] },
        {
          model: TeamBoardComment,
          as: 'comments',
          separate: true,
          order: [['created_at', 'ASC']],
          include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
        },
      ],
    });

    if (!board) throw new BadRequestError('게시글을 찾을 수 없습니다.');

    await board.increment('view_count');
    const j = board.toJSON();

    // 작성자 + 댓글 작성자 + 조회자 본인 역할/이미지
    const memberIds = [j.user_id, userId, ...(j.comments || []).map((c) => c.user_id)];
    const roleMap = await getRoleMap(j.team_id, [...new Set(memberIds)]);
    const viewerIsAdmin = ADMIN_ROLES.includes(roleMap[userId]?.role);

    const comments = (j.comments || []).map((c) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author: c.author,
      authorRole: roleMap[c.user_id]?.role || 'member',
      authorImage: roleMap[c.user_id]?.image || null,
      isMine: c.user_id === userId,
    }));

    const pollSummary = await buildPollSummary(j.poll, userId, viewerIsAdmin);

    return sendSuccessResponse(res, 200, {
      ...j,
      view_count: board.view_count + 1,
      authorRole: roleMap[j.user_id]?.role || 'member',
      authorImage: roleMap[j.user_id]?.image || null,
      isMine: j.user_id === userId,
      reactionSummary: summarizeReactions(j.reactions, userId),
      pollSummary,
      comments,
    });
  } catch (err) {
    logger.error('게시글 조회 에러:', err);
    if (err instanceof BadRequestError) throw err;
    throw new BadGatewayError(`게시글 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

const normalizeCategory = (category) => (CATEGORIES.includes(category) ? category : '자유');

/**
 * @swagger
 * /team/boards:
 *   post:
 *     summary: 게시글 작성
 *     tags: [Board]
 */
const createBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      title,
      content,
      category,
      attachments = [],
      links = [],
      poll = null,
      match_id = null,
      send_push = false,
      player_notes = [],
    } = req.body;

    if (!title || !content) throw new BadRequestError('제목과 내용은 필수입니다.');
    if (title.length > TITLE_MAX) throw new BadRequestError(`제목은 ${TITLE_MAX}자 이하로 입력해주세요.`);

    const teamMember = await getDefaultTeamMember(userId);
    if (!teamMember) throw new BadRequestError('가입된 팀이 없습니다.');
    const teamId = teamMember.team.id;

    const cat = normalizeCategory(category);
    const isNotice = cat === '공지';

    // 공지는 관리자만 작성 가능
    if (isNotice && !ADMIN_ROLES.includes(teamMember.role)) {
      throw new UnauthorizedError('공지사항은 관리자만 작성할 수 있습니다.');
    }

    const board = await TeamBoard.create({
      team_id: teamId,
      user_id: userId,
      category: cat,
      title,
      content,
      attachments: Array.isArray(attachments) ? attachments : [],
      links: Array.isArray(links) ? links : [],
      poll: poll && Array.isArray(poll.options) && poll.options.length ? poll : null,
      match_id: cat === '후기' ? match_id || null : null,
      player_notes: cat === '후기' && Array.isArray(player_notes) ? player_notes : [],
      send_push: isNotice && send_push ? 1 : 0,
      is_notice: isNotice ? 1 : 0,
    });

    // 공지 푸시 발송 (인프라 연동 지점 — 현재는 로그 스텁)
    if (isNotice && send_push) {
      logger.info(`[PUSH] 팀 ${teamId} 공지 발송 요청: board=${board.id} "${title}"`);
    }

    return sendSuccessResponse(res, 200, board, '게시글이 작성되었습니다.');
  } catch (err) {
    logger.error('게시글 작성 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`게시글 작성 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 작성자 본인 또는 관리자 권한 확인
const assertBoardPermission = async (userId, board) => {
  const teamMember = await BasketballTeamMember.findOne({
    where: { user_id: userId, team_id: board.team_id, is_active: 1 },
  });
  if (!teamMember) throw new UnauthorizedError('권한이 없습니다.');
  const isAuthor = board.user_id === userId;
  const isAdmin = ADMIN_ROLES.includes(teamMember.role);
  if (!isAuthor && !isAdmin) throw new UnauthorizedError('권한이 없습니다.');
  return { isAuthor, isAdmin, teamMember };
};

/**
 * @swagger
 * /team/boards/{id}:
 *   put:
 *     summary: 게시글 수정
 *     tags: [Board]
 */
const updateBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, content, category, attachments, links, poll, match_id, send_push, player_notes } = req.body;

    if (title !== undefined && title && title.length > TITLE_MAX) {
      throw new BadRequestError(`제목은 ${TITLE_MAX}자 이하로 입력해주세요.`);
    }

    const board = await TeamBoard.findOne({ where: { id } });
    if (!board) throw new BadRequestError('게시글을 찾을 수 없습니다.');

    const { isAdmin } = await assertBoardPermission(userId, board);

    const nextCategory = category !== undefined ? normalizeCategory(category) : board.category;
    const willBeNotice = nextCategory === '공지';
    const willBeReview = nextCategory === '후기';

    // 공지로의 변경은 관리자만
    if (willBeNotice && !board.is_notice && !isAdmin) {
      throw new UnauthorizedError('공지사항 설정은 관리자만 가능합니다.');
    }

    // 투표 수정 시 기존 표는 유지(남아있는 옵션 기준)
    let nextPoll = board.poll;
    if (poll !== undefined) {
      if (poll && Array.isArray(poll.options) && poll.options.length) {
        const prevVotes = (board.poll && board.poll.votes) || {};
        const validIds = new Set(poll.options.map((o) => o.id));
        const carried = {};
        for (const uid of Object.keys(prevVotes)) {
          const filtered = (prevVotes[uid] || []).filter((oid) => validIds.has(oid));
          if (filtered.length) carried[uid] = filtered;
        }
        nextPoll = { ...poll, votes: carried };
      } else {
        nextPoll = null;
      }
    }

    await board.update({
      title: title || board.title,
      content: content || board.content,
      category: nextCategory,
      is_notice: willBeNotice ? 1 : 0,
      attachments: attachments !== undefined ? attachments : board.attachments,
      links: links !== undefined ? links : board.links,
      poll: nextPoll,
      match_id: willBeReview ? (match_id !== undefined ? match_id || null : board.match_id) : null,
      player_notes: willBeReview
        ? (player_notes !== undefined ? (Array.isArray(player_notes) ? player_notes : []) : board.player_notes)
        : [],
      send_push: send_push !== undefined ? (willBeNotice && send_push ? 1 : 0) : board.send_push,
      is_edited: 1,
    });

    return sendSuccessResponse(res, 200, board, '게시글이 수정되었습니다.');
  } catch (err) {
    logger.error('게시글 수정 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`게시글 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}:
 *   delete:
 *     summary: 게시글 삭제
 *     tags: [Board]
 */
const deleteBoard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const board = await TeamBoard.findOne({ where: { id } });
    if (!board) throw new BadRequestError('게시글을 찾을 수 없습니다.');

    await assertBoardPermission(userId, board);
    await TeamBoardComment.destroy({ where: { board_id: board.id } });
    await board.destroy();

    return sendSuccessResponse(res, 200, null, '게시글이 삭제되었습니다.');
  } catch (err) {
    logger.error('게시글 삭제 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`게시글 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 같은 팀 멤버인지 확인
const assertTeamMemberOfBoard = async (userId, board) => {
  const member = await BasketballTeamMember.findOne({
    where: { user_id: userId, team_id: board.team_id, is_active: 1 },
  });
  if (!member) throw new UnauthorizedError('권한이 없습니다.');
  return member;
};

/**
 * @swagger
 * /team/boards/{id}/comments:
 *   post:
 *     summary: 댓글 작성
 *     tags: [Board]
 */
const addComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) throw new BadRequestError('댓글 내용을 입력하세요.');

    const board = await TeamBoard.findOne({ where: { id } });
    if (!board) throw new BadRequestError('게시글을 찾을 수 없습니다.');
    await assertTeamMemberOfBoard(userId, board);

    const comment = await TeamBoardComment.create({
      board_id: board.id,
      user_id: userId,
      content: content.trim(),
    });

    return sendSuccessResponse(res, 200, comment, '댓글이 작성되었습니다.');
  } catch (err) {
    logger.error('댓글 작성 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`댓글 작성 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}/comments/{commentId}:
 *   delete:
 *     summary: 댓글 삭제
 *     tags: [Board]
 */
const deleteComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { commentId } = req.params;

    const comment = await TeamBoardComment.findOne({ where: { id: commentId } });
    if (!comment) throw new BadRequestError('댓글을 찾을 수 없습니다.');

    const board = await TeamBoard.findOne({ where: { id: comment.board_id } });
    const member = board ? await assertTeamMemberOfBoard(userId, board) : null;
    const isAdmin = member && ADMIN_ROLES.includes(member.role);

    if (comment.user_id !== userId && !isAdmin) {
      throw new UnauthorizedError('권한이 없습니다.');
    }

    await comment.destroy();
    return sendSuccessResponse(res, 200, null, '댓글이 삭제되었습니다.');
  } catch (err) {
    logger.error('댓글 삭제 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`댓글 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}/reactions:
 *   post:
 *     summary: 반응(좋아요/이모지) 토글
 *     tags: [Board]
 */
const toggleReaction = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) throw new BadRequestError('이모지가 필요합니다.');

    const board = await TeamBoard.findOne({ where: { id } });
    if (!board) throw new BadRequestError('게시글을 찾을 수 없습니다.');
    await assertTeamMemberOfBoard(userId, board);

    const reactions = { ...(board.reactions || {}) };
    const list = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
    const idx = list.indexOf(userId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(userId);

    if (list.length) reactions[emoji] = list;
    else delete reactions[emoji];

    await board.update({ reactions });

    return sendSuccessResponse(res, 200, summarizeReactions(reactions, userId), null);
  } catch (err) {
    logger.error('반응 토글 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`반응 처리 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}/poll/vote:
 *   post:
 *     summary: 게시글 투표
 *     tags: [Board]
 */
const votePoll = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { optionIds } = req.body; // 배열

    const board = await TeamBoard.findOne({ where: { id } });
    if (!board) throw new BadRequestError('게시글을 찾을 수 없습니다.');
    const member = await assertTeamMemberOfBoard(userId, board);
    const viewerIsAdmin = ADMIN_ROLES.includes(member.role);

    const poll = board.poll;
    if (!poll || !Array.isArray(poll.options) || !poll.options.length) {
      throw new BadRequestError('투표가 없는 게시글입니다.');
    }

    const validIds = new Set(poll.options.map((o) => o.id));
    let selected = (Array.isArray(optionIds) ? optionIds : [optionIds]).filter((x) => validIds.has(x));
    if (!poll.allowMulti) selected = selected.slice(0, 1);

    const votes = { ...(poll.votes || {}) };
    if (selected.length === 0) delete votes[userId];
    else votes[userId] = selected;

    const nextPoll = { ...poll, votes };
    await board.update({ poll: nextPoll });

    const summary = await buildPollSummary(nextPoll, userId, viewerIsAdmin);
    return sendSuccessResponse(res, 200, summary, null);
  } catch (err) {
    logger.error('투표 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`투표 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/home-notice:
 *   get:
 *     summary: 홈 노출 공지 조회 (지정된 것, 없으면 최신 공지)
 *     tags: [Board]
 */
const getHomeNotice = async (req, res) => {
  try {
    const userId = getUserId(req);
    const teamMember = await getDefaultTeamMember(userId);
    if (!teamMember) return sendSuccessResponse(res, 200, null);
    const teamId = teamMember.team.id;

    // 명시적으로 지정된 홈 공지만 노출 (없으면 표시 안 함)
    const board = await TeamBoard.findOne({
      where: { team_id: teamId, pinned_home: 1 },
      attributes: ['id', 'title', 'category', 'created_at'],
    });

    return sendSuccessResponse(res, 200, board || null);
  } catch (err) {
    logger.error('홈 공지 조회 에러:', err);
    if (err instanceof BadRequestError) throw err;
    throw new BadGatewayError(`홈 공지 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

/**
 * @swagger
 * /team/boards/{id}/pin-home:
 *   post:
 *     summary: 홈 노출 공지 설정/해제 (관리자, 팀당 1개)
 *     tags: [Board]
 */
const toggleHomeNotice = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const board = await TeamBoard.findOne({ where: { id } });
    if (!board) throw new BadRequestError('게시글을 찾을 수 없습니다.');

    const member = await BasketballTeamMember.findOne({
      where: { user_id: userId, team_id: board.team_id, is_active: 1 },
    });
    if (!member || !ADMIN_ROLES.includes(member.role)) {
      throw new UnauthorizedError('홈 공지 설정은 관리자만 가능합니다.');
    }
    if (board.category !== '공지') {
      throw new BadRequestError('공지 분류 글만 홈에 노출할 수 있습니다.');
    }

    if (board.pinned_home) {
      await board.update({ pinned_home: 0 });
      return sendSuccessResponse(res, 200, { pinned_home: 0 }, '홈 공지가 해제되었습니다.');
    }

    // 팀 내 기존 홈 공지 해제 후 지정
    await TeamBoard.update(
      { pinned_home: 0 },
      { where: { team_id: board.team_id, pinned_home: 1 } }
    );
    await board.update({ pinned_home: 1 });
    return sendSuccessResponse(res, 200, { pinned_home: 1 }, '홈 공지로 설정되었습니다.');
  } catch (err) {
    logger.error('홈 공지 설정 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`홈 공지 설정 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = {
  getBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  addComment,
  deleteComment,
  toggleReaction,
  votePoll,
  getHomeNotice,
  toggleHomeNotice,
};
