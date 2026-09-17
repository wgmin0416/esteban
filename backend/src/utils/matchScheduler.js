const { Op } = require('sequelize');
const { TeamMatchSchedule, BasketballMatch } = require('../models/index.js');
const logger = require('./logger');

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 다음 회차 일시(now 이후 가장 가까운 weekday·time)
const nextOccurrence = (weekday, time, now) => {
  const [h, m] = String(time || '00:00').split(':').map((x) => parseInt(x) || 0);
  const cand = new Date(now);
  const daysAhead = (weekday - cand.getDay() + 7) % 7;
  cand.setDate(cand.getDate() + daysAhead);
  cand.setHours(h, m, 0, 0);
  if (cand.getTime() <= now.getTime()) cand.setDate(cand.getDate() + 7);
  return cand;
};

// 스케줄 1개에 대해 다음 회차 경기 보장 (lead_days 이내면 생성, 중복 방지)
const ensureSchedule = async (s) => {
  const now = new Date();
  const occ = nextOccurrence(s.weekday, s.time, now);
  const occDateStr = ymd(occ);
  const leadMs = (s.lead_days || 7) * 86400000;
  if (occ.getTime() - now.getTime() > leadMs) return false; // 아직 생성 시점 아님
  if (s.last_created_date === occDateStr) return false; // 이미 이 회차 생성함

  // 같은 날 이미 경기가 있으면(수동 생성 등) 중복 생성 안 함
  const dayStart = new Date(occ);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(occ);
  dayEnd.setHours(23, 59, 59, 999);
  const exists = await BasketballMatch.findOne({
    where: { team_id: s.team_id, match_date: { [Op.between]: [dayStart, dayEnd] } },
  });
  if (!exists) {
    await BasketballMatch.create({
      team_id: s.team_id,
      title: s.title || '정기 경기',
      match_date: occ,
      location: s.location || '',
      type: 'intra_squad',
      quarter_count: s.quarter_count || 4,
      quarter_minutes: 10,
      status: 'scheduled',
    });
    logger.info(`[SCHEDULE] 팀 ${s.team_id} 정기경기 생성: ${occDateStr} ${s.time}`);
  }
  await s.update({ last_created_date: occDateStr });
  return true;
};

// 특정 팀의 활성 스케줄 보장 (앱 로드 시 지연 생성용)
const ensureTeamSchedules = async (teamId) => {
  try {
    const schedules = await TeamMatchSchedule.findAll({ where: { team_id: teamId, is_active: 1 } });
    for (const s of schedules) await ensureSchedule(s);
  } catch (e) {
    logger.error('팀 스케줄 보장 에러:', e.message);
  }
};

// 전체 활성 스케줄 보장 (주기 스케줄러용)
const ensureAllSchedules = async () => {
  try {
    const schedules = await TeamMatchSchedule.findAll({ where: { is_active: 1 } });
    for (const s of schedules) {
      try {
        await ensureSchedule(s);
      } catch (e) {
        logger.error(`스케줄 ${s.id} 처리 에러:`, e.message);
      }
    }
  } catch (e) {
    logger.error('전체 스케줄 보장 에러:', e.message);
  }
};

module.exports = { ensureSchedule, ensureTeamSchedules, ensureAllSchedules, nextOccurrence };
