const { TeamMatchSchedule, BasketballTeamMember, User } = require('../models/index.js');
const { BadRequestError, BadGatewayError, UnauthorizedError } = require('../errors/index.js');
const logger = require('../utils/logger');
const { getUserId, getDefaultTeamMember, sendSuccessResponse } = require('../utils/controllerHelpers');
const { ensureTeamSchedules } = require('../utils/matchScheduler');

const ADMIN_ROLES = ['manager', 'leader'];

// 관리 권한(팀 리더/매니저 또는 admin/developer) 확인 후 teamId 반환
const assertManage = async (userId) => {
  const tm = await getDefaultTeamMember(userId);
  if (!tm) throw new BadRequestError('가입된 팀이 없습니다.');
  const user = await User.findByPk(userId);
  const isAdmin = user && ['admin', 'developer'].includes(user.role);
  if (!isAdmin && !ADMIN_ROLES.includes(tm.role)) {
    throw new UnauthorizedError('정기 경기 설정은 운영진만 가능합니다.');
  }
  return tm.team.id;
};

const validate = (b) => {
  const weekday = parseInt(b.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new BadRequestError('요일이 올바르지 않습니다.');
  if (!/^\d{1,2}:\d{2}$/.test(b.time || '')) throw new BadRequestError('시간 형식(HH:MM)이 올바르지 않습니다.');
  const quarter_count = Math.min(Math.max(parseInt(b.quarter_count) || 4, 1), 8);
  const lead_days = Math.min(Math.max(parseInt(b.lead_days) || 7, 1), 30);
  return {
    weekday,
    time: b.time,
    title: (b.title || '정기 경기').trim() || '정기 경기',
    location: (b.location || '').trim(),
    quarter_count,
    lead_days,
    is_active: b.is_active === false || b.is_active === 0 ? 0 : 1,
  };
};

// 목록 (모든 팀원 조회 가능)
const getSchedules = async (req, res) => {
  try {
    const userId = getUserId(req);
    const tm = await getDefaultTeamMember(userId);
    if (!tm) return sendSuccessResponse(res, 200, []);
    const rows = await TeamMatchSchedule.findAll({
      where: { team_id: tm.team.id },
      order: [['weekday', 'ASC'], ['time', 'ASC']],
    });
    return sendSuccessResponse(res, 200, rows);
  } catch (err) {
    logger.error('정기 경기 목록 조회 에러:', err);
    if (err instanceof BadRequestError) throw err;
    throw new BadGatewayError(`정기 경기 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

const createSchedule = async (req, res) => {
  try {
    const userId = getUserId(req);
    const teamId = await assertManage(userId);
    const v = validate(req.body);
    const row = await TeamMatchSchedule.create({ team_id: teamId, created_by: userId, ...v });
    await ensureTeamSchedules(teamId); // 즉시 생성 대상이면 반영
    return sendSuccessResponse(res, 200, row, '정기 경기 스케줄이 추가되었습니다.');
  } catch (err) {
    logger.error('정기 경기 생성 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`정기 경기 생성 중 오류가 발생했습니다: ${err.message}`);
  }
};

const updateSchedule = async (req, res) => {
  try {
    const userId = getUserId(req);
    const teamId = await assertManage(userId);
    const { id } = req.params;
    const row = await TeamMatchSchedule.findOne({ where: { id, team_id: teamId } });
    if (!row) throw new BadRequestError('스케줄을 찾을 수 없습니다.');
    const v = validate({ ...row.toJSON(), ...req.body });
    // 요일/시간이 바뀌면 새 회차를 다시 생성할 수 있도록 last_created_date 리셋
    const keyChanged = v.weekday !== row.weekday || v.time !== row.time;
    await row.update({ ...v, ...(keyChanged ? { last_created_date: null } : {}) });
    await ensureTeamSchedules(teamId);
    return sendSuccessResponse(res, 200, row, '정기 경기 스케줄이 수정되었습니다.');
  } catch (err) {
    logger.error('정기 경기 수정 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`정기 경기 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const userId = getUserId(req);
    const teamId = await assertManage(userId);
    const { id } = req.params;
    const row = await TeamMatchSchedule.findOne({ where: { id, team_id: teamId } });
    if (!row) throw new BadRequestError('스케줄을 찾을 수 없습니다.');
    await row.destroy();
    return sendSuccessResponse(res, 200, null, '정기 경기 스케줄이 삭제되었습니다.');
  } catch (err) {
    logger.error('정기 경기 삭제 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`정기 경기 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = { getSchedules, createSchedule, updateSchedule, deleteSchedule };
