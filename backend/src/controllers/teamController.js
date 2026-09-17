const {
  BadGatewayError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} = require('../errors/index.js');
const {
  sequelize,
  User,
  Team,
  BasketballTeamMember,
  JoinRequest,
  BasketballMemberPeriodRecord,
  BasketballMemberMatchRecord,
  BasketballMemberQuarterRecord,
  BasketballMatchSquad,
  BasketballMatchSquadMember,
  BasketballMatchAttendance,
  BasketballMatch,
  TeamDue,
} = require('../models/index.js');
const { Op, Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const redisClient = require('../config/redisClient.js');
const { ensureTeamSchedules } = require('../utils/matchScheduler');

// 창단 일시 정규화: 연·월만 입력('YYYY-MM')받아 해당 월 1일로 저장
const normalizeEstablishedAt = (value) => {
  if (!value || value.trim() === '') return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`; // YYYY-MM → YYYY-MM-01
  return v; // 이미 전체 날짜 형식이면 그대로
};

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
 *         - intro(팀 소개)
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
 *                 description: 창단 연·월 (YYYY-MM). 서버에서 해당 월 1일로 저장됨.
 *                 example: "2025-11"
 *               is_public:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: 팀 생성 성공 여부
 */
const createTeam = async (req, res) => {
  try {
    const { name, leader_id, sports, intro, logo_url, region, established_at, is_public } =
      req.body;

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

    const existingTeamsCount = await Team.count({
      where: {
        leader_id: parseInt(leader_id),
        sports,
      },
    });

    if (existingTeamsCount >= 2) {
      throw new BadRequestError('한 종목에서 최대 2개의 팀만 생성할 수 있습니다.');
    }

    const teamData = {
      name: name.trim(),
      leader_id: parseInt(leader_id),
      sports,
      region: region.trim(),
      intro: intro && intro.trim() !== '' ? intro.trim() : null,
      logo_url: logo_url && logo_url.trim() !== '' ? logo_url.trim() : null,
      // 창단은 연·월까지만 입력받음: 'YYYY-MM' → 해당 월 1일로 정규화
      established_at: normalizeEstablishedAt(established_at),
      is_public: is_public !== undefined && is_public !== null ? parseInt(is_public) : 1,
    };

    const newTeam = await Team.create(teamData);

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

    await BasketballTeamMember.create({
      team_id: newTeam.id,
      user_id: leader_id,
      role: 'leader',
      is_active: 1,
      is_default: hasDefaultTeam ? 0 : 1,
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

// 팀 정보 조회
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
 */
const getTeamInfo = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        is_default: 1,
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
            'boost_promoted_at',
            'booster_expired_at',
          ],
        },
      ],
      order: [
        ['is_default', 'DESC'],
        ['created_at', 'ASC'],
      ],
    });

    if (!teamMember || !teamMember.team) {
      return res.status(200).json({ success: true, data: null });
    }

    // 팀 정보와 사용자의 역할 정보를 함께 반환
    const teamData = {
      ...teamMember.team.dataValues,
      role: teamMember.role, // 사용자의 팀 내 역할 (leader, manager, member)
    };

    return res.status(200).json({ success: true, data: teamData });
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
 *         description: 팀 전체 회원 조회 성공
 */
const getMembers = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 현재 사용자의 기본 팀 조회
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        is_default: 1,
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
        },
      ],
    });

    if (!teamMember || !teamMember.team) {
      return res.status(200).json({ success: true, data: [] });
    }

    const teamId = teamMember.team.id;

    // 해당 팀의 활성 멤버만 조회
    const members = await BasketballTeamMember.findAll({
      where: {
        team_id: teamId,
        is_active: 1,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'gender'],
        },
      ],
      order: [
        ['role', 'DESC'], // leader, manager, member 순
        ['created_at', 'ASC'],
      ],
    });

    // 응답 형식 변환 (기존 형식과 호환)
    const formattedMembers = members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      phone: member.user.phone,
      gender: member.user.gender,
      team_members: [
        {
          image_url: member.image_url,
          intro: member.intro,
          role: member.role,
          position: member.position,
          uniform_number: member.uniform_number,
          activity_score: member.activity_score,
          last_attended_at: member.last_attended_at,
          is_active: member.is_active,
        },
      ],
    }));

    return res.status(200).json({ success: true, data: formattedMembers });
  } catch (err) {
    logger.error('팀 회원 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`팀 회원 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 회원 조회
const getMember = async (req, res) => {
  try {
    const where = { id: req.query.memberId };
    if (!req.query.memberId) {
      throw new BadRequestError('회원 번호를 입력해주세요.');
    }
    const member = await User.findOne({ where });
    if (member) {
      return res.status(200).json({ success: true, data: member });
    } else {
      throw new BadRequestError('존재하지 않는 회원입니다.');
    }
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 랭킹 사용 가능한 연도 목록 조회
/**
 * @swagger
 * /team/rankings/years:
 *   get:
 *     summary: 랭킹 조회 가능한 연도 목록
 *     tags:
 *       - Team
 *     responses:
 *       200:
 *         description: 연도 목록 조회 성공
 */
const getRankingsYears = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        is_default: 1,
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
        },
      ],
    });

    if (!teamMember || !teamMember.team) {
      return res.status(200).json({ success: true, data: [] });
    }

    const teamId = teamMember.team.id;

    // 실제 기록(match_records) 기준으로 연도 도출
    const records = await BasketballMemberMatchRecord.findAll({
      where: {
        team_id: teamId,
      },
      attributes: [[Sequelize.fn('YEAR', Sequelize.col('created_at')), 'year']],
      group: [Sequelize.fn('YEAR', Sequelize.col('created_at'))],
      raw: true,
    });

    const years = records
      .map((r) => parseInt(r.year))
      .filter((y) => !isNaN(y))
      .sort((a, b) => b - a);

    // 기록이 없으면 현재 연도만
    const uniqueYears = years.length ? years : [new Date().getFullYear()];

    return res.status(200).json({ success: true, data: uniqueYears });
  } catch (err) {
    logger.error('랭킹 연도 목록 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`랭킹 연도 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 랭킹 조회
/**
 * @swagger
 * /team/rankings:
 *   get:
 *     summary: 팀 랭킹 조회
 *     tags:
 *       - Team
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [TOTAL, GP, W, L, POINTS, REBOUNDS, ASSISTS, BLOCKS, STEALS, TURNOVERS, FOULS, FIELD_GOAL_PCT, THREE_POINTER_PCT, FREE_THROW_PCT]
 *         required: true
 *         description: 랭킹 카테고리
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         required: true
 *         description: 연도
 *     responses:
 *       200:
 *         description: 랭킹 조회 성공
 */
const getRankings = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { category = 'TOTAL', year } = req.query;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    if (!year) {
      throw new BadRequestError('연도를 입력해주세요.');
    }

    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        is_default: 1,
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
        },
      ],
    });

    if (!teamMember || !teamMember.team) {
      return res.status(200).json({ success: true, data: [] });
    }

    const teamId = teamMember.team.id;

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31 23:59:59`);

    const aggregatedData = await BasketballMemberPeriodRecord.findAll({
      where: {
        team_id: teamId,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        'user_id',
        [Sequelize.fn('SUM', Sequelize.col('pts')), 'total_pts'],
        [Sequelize.fn('SUM', Sequelize.col('reb')), 'total_reb'],
        [Sequelize.fn('SUM', Sequelize.col('ast')), 'total_ast'],
        [Sequelize.fn('SUM', Sequelize.col('blk')), 'total_blk'],
        [Sequelize.fn('SUM', Sequelize.col('stl')), 'total_stl'],
        [Sequelize.fn('SUM', Sequelize.col('turnover')), 'total_turnover'],
        [Sequelize.fn('SUM', Sequelize.col('pf')), 'total_pf'],
        [Sequelize.fn('AVG', Sequelize.col('fg_pct')), 'avg_fg_pct'],
        [Sequelize.fn('AVG', Sequelize.col('threep_pct')), 'avg_threep_pct'],
        [Sequelize.fn('AVG', Sequelize.col('ft_pct')), 'avg_ft_pct'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'games_played'],
        [Sequelize.fn('SUM', Sequelize.col('is_win')), 'wins'],
      ],
      group: ['user_id'],
      having: Sequelize.where(Sequelize.fn('COUNT', Sequelize.col('id')), '>=', 20),
      raw: true,
    });

    const categoryFieldMap = {
      TOTAL: (row) =>
        parseFloat(row.total_pts || 0) +
        parseFloat(row.total_reb || 0) +
        parseFloat(row.total_ast || 0) +
        parseFloat(row.total_blk || 0) +
        parseFloat(row.total_stl || 0) -
        parseFloat(row.total_turnover || 0) -
        parseFloat(row.total_pf || 0),
      GP: (row) => parseFloat(row.games_played || 0),
      W: (row) => parseFloat(row.wins || 0),
      L: (row) => parseFloat(row.games_played || 0) - parseFloat(row.wins || 0),
      POINTS: (row) => parseFloat(row.total_pts || 0),
      REBOUNDS: (row) => parseFloat(row.total_reb || 0),
      ASSISTS: (row) => parseFloat(row.total_ast || 0),
      BLOCKS: (row) => parseFloat(row.total_blk || 0),
      STEALS: (row) => parseFloat(row.total_stl || 0),
      TURNOVERS: (row) => parseFloat(row.total_turnover || 0),
      FOULS: (row) => parseFloat(row.total_pf || 0),
      FIELD_GOAL_PCT: (row) => parseFloat(row.avg_fg_pct || 0),
      THREE_POINTER_PCT: (row) => parseFloat(row.avg_threep_pct || 0),
      FREE_THROW_PCT: (row) => parseFloat(row.avg_ft_pct || 0),
    };

    const getValue = categoryFieldMap[category] || categoryFieldMap.TOTAL;
    const isDescending =
      category === 'TURNOVERS' || category === 'FOULS' || category === 'L' ? false : true;

    aggregatedData.sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);
      return isDescending ? valueB - valueA : valueA - valueB;
    });

    const top10 = aggregatedData.slice(0, 10);

    const userIds = top10.map((row) => row.user_id);
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'name'],
    });

    const teamMembers = await BasketballTeamMember.findAll({
      where: {
        team_id: teamId,
        user_id: { [Op.in]: userIds },
        is_active: 1,
      },
      attributes: ['user_id', 'image_url'],
    });

    const userMap = {};
    users.forEach((user) => {
      userMap[user.id] = user;
    });

    const teamMemberMap = {};
    teamMembers.forEach((tm) => {
      teamMemberMap[tm.user_id] = tm;
    });

    const formattedRankings = top10.map((row, index) => {
      const user = userMap[row.user_id];
      const teamMember = teamMemberMap[row.user_id];
      const value = getValue(row);

      return {
        rank: index + 1,
        userId: user?.id || row.user_id,
        userName: user?.name || `선수${row.user_id}`,
        userImage: teamMember?.image_url || null,
        value: value,
        category: category,
        year: parseInt(year),
        gamesPlayed: parseInt(row.games_played || 0),
        wins: parseInt(row.wins || 0),
        losses: parseInt(row.games_played || 0) - parseInt(row.wins || 0),
      };
    });

    return res.status(200).json({ success: true, data: formattedRankings });
  } catch (err) {
    logger.error('랭킹 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`랭킹 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 기록 조회 - 사용 가능한 연도 목록
/**
 * @swagger
 * /team/records/years:
 *   get:
 *     summary: 기록 조회 가능한 연도 목록
 *     tags:
 *       - Team
 *     responses:
 *       200:
 *         description: 연도 목록 조회 성공
 */
const getRecordsYears = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 현재 사용자의 기본 팀 조회
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        is_default: 1,
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
        },
      ],
    });

    if (!teamMember || !teamMember.team) {
      return res.status(200).json({ success: true, data: [] });
    }

    const teamId = teamMember.team.id;

    // 해당 팀의 기록이 있는 연도들 조회 (basketball_member_match_records에서)
    const records = await BasketballMemberMatchRecord.findAll({
      where: {
        team_id: teamId,
      },
      attributes: [[Sequelize.fn('YEAR', Sequelize.col('created_at')), 'year']],
      group: [Sequelize.fn('YEAR', Sequelize.col('created_at'))],
      raw: true,
    });

    const years = records
      .map((r) => parseInt(r.year))
      .filter((y) => !isNaN(y))
      .sort((a, b) => b - a);

    return res.status(200).json({ success: true, data: years });
  } catch (err) {
    logger.error('기록 연도 목록 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`기록 연도 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 기록 조회
/**
 * @swagger
 * /team/records:
 *   get:
 *     summary: 팀 기록 조회
 *     tags:
 *       - Team
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: 연도
 *       - in: query
 *         name: quarter
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3, 4]
 *         description: 분기 (1-4)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작 날짜 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료 날짜 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 기록 조회 성공
 */
const getRecords = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { year, quarter, startDate, endDate } = req.query;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 현재 사용자의 기본 팀 조회
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        is_default: 1,
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
        },
      ],
    });

    if (!teamMember || !teamMember.team) {
      return res.status(200).json({ success: true, data: [] });
    }

    const teamId = teamMember.team.id;

    // 날짜 필터 설정
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        created_at: {
          [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')],
        },
      };
    } else if (year) {
      let start, end;
      if (quarter) {
        // 분기별 필터
        const quarterStartMonth = (quarter - 1) * 3 + 1;
        const quarterEndMonth = quarter * 3;
        start = new Date(`${year}-${String(quarterStartMonth).padStart(2, '0')}-01`);
        end = new Date(`${year}-${String(quarterEndMonth).padStart(2, '0')}-31 23:59:59`);
      } else {
        // 연도별 필터
        start = new Date(`${year}-01-01`);
        end = new Date(`${year}-12-31 23:59:59`);
      }
      dateFilter = {
        created_at: {
          [Op.between]: [start, end],
        },
      };
    }

    // 사용자별 집계 데이터 조회
    const aggregatedData = await BasketballMemberMatchRecord.findAll({
      where: {
        team_id: teamId,
        ...dateFilter,
      },
      attributes: [
        'user_id',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'gp'],
        [Sequelize.fn('SUM', Sequelize.col('is_win')), 'w'],
        [Sequelize.literal('COUNT(id) - SUM(is_win)'), 'l'],
        [Sequelize.fn('AVG', Sequelize.col('pts')), 'pts'],
        [Sequelize.fn('AVG', Sequelize.col('fg_pct')), 'fg_pct'],
        [Sequelize.fn('AVG', Sequelize.col('twop_pct')), 'twop_pct'],
        [Sequelize.fn('AVG', Sequelize.col('threep_pct')), 'threep_pct'],
        [Sequelize.fn('AVG', Sequelize.col('ft_pct')), 'ft_pct'],
        [Sequelize.fn('AVG', Sequelize.col('reb')), 'reb'],
        [Sequelize.fn('AVG', Sequelize.col('oreb')), 'oreb'],
        [Sequelize.fn('AVG', Sequelize.col('dreb')), 'dreb'],
        [Sequelize.fn('AVG', Sequelize.col('ast')), 'ast'],
        [Sequelize.fn('AVG', Sequelize.col('stl')), 'stl'],
        [Sequelize.fn('AVG', Sequelize.col('blk')), 'blk'],
        [Sequelize.fn('AVG', Sequelize.col('turnover')), 'turnover'],
        [Sequelize.fn('AVG', Sequelize.col('pf')), 'pf'],
        [Sequelize.fn('SUM', Sequelize.col('dd2')), 'dd2'],
        [Sequelize.fn('SUM', Sequelize.col('td3')), 'td3'],
        // 2점슛, 3점슛, 자유투 성공률 계산을 위한 평균 메이드/시도
        [Sequelize.fn('AVG', Sequelize.col('twopm')), 'twopm_avg'],
        [Sequelize.fn('AVG', Sequelize.col('twopa')), 'twopa_avg'],
        [Sequelize.fn('AVG', Sequelize.col('threepm')), 'threepm_avg'],
        [Sequelize.fn('AVG', Sequelize.col('threepa')), 'threepa_avg'],
        [Sequelize.fn('AVG', Sequelize.col('ftm')), 'ftm_avg'],
        [Sequelize.fn('AVG', Sequelize.col('fta')), 'fta_avg'],
      ],
      group: ['user_id'],
      raw: true,
    });

    // 사용자 정보 및 팀 멤버 정보 조회
    const userIds = aggregatedData.map((row) => row.user_id);
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'name'],
    });

    const teamMembers = await BasketballTeamMember.findAll({
      where: {
        team_id: teamId,
        user_id: { [Op.in]: userIds },
        is_active: 1,
      },
      attributes: ['user_id', 'image_url'],
    });

    const userMap = {};
    users.forEach((user) => {
      userMap[user.id] = user;
    });

    const teamMemberMap = {};
    teamMembers.forEach((tm) => {
      teamMemberMap[tm.user_id] = tm;
    });

    // 선수별 +/- (득실 마진) — on_court 쿼터의 마진 합
    const marginCtx = await loadMarginContext(teamId, dateFilter);
    const pmMap = playerPlusMinus(marginCtx);

    // PIE(Player Impact Estimate): 경기 전체 기여 합 중 내 몫 — 경기 단위로 계산
    const pieRecs = await BasketballMemberMatchRecord.findAll({
      where: { team_id: teamId, ...dateFilter },
      attributes: ['user_id', 'match_id', 'pts', 'fgm', 'fga', 'ftm', 'fta', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'pf', 'turnover'],
      raw: true,
    });
    const contrib = (r) =>
      toInt(r.pts) + toInt(r.fgm) + toInt(r.ftm) - toInt(r.fga) - toInt(r.fta) +
      toInt(r.dreb) + 0.5 * toInt(r.oreb) + toInt(r.ast) + toInt(r.stl) + 0.5 * toInt(r.blk) -
      toInt(r.pf) - toInt(r.turnover);
    const gameTotal = {}; // match_id → 경기 전체 기여 합(게스트 포함)
    const playerContrib = {}; // user_id → { num, matches:[] }
    for (const r of pieRecs) {
      const c = contrib(r);
      gameTotal[r.match_id] = (gameTotal[r.match_id] || 0) + c;
      if (r.user_id == null) continue;
      const p = (playerContrib[r.user_id] = playerContrib[r.user_id] || { num: 0, matches: [] });
      p.num += c;
      p.matches.push(r.match_id);
    }
    const pieMap = new Map();
    for (const [uid, v] of Object.entries(playerContrib)) {
      const den = v.matches.reduce((s, m) => s + (gameTotal[m] || 0), 0);
      pieMap.set(Number(uid), den > 0 ? (v.num / den) * 100 : 0);
    }

    const num = (v) => parseFloat(v || 0);
    // 결과 포맷팅
    const formattedRecords = aggregatedData.map((row, index) => {
      const user = userMap[row.user_id];
      const teamMember = teamMemberMap[row.user_id];
      const gp = parseInt(row.gp || 0);
      const w = parseInt(row.w || 0);
      const l = gp - w;

      // 2점슛, 3점슛, 자유투 성공률 계산 (평균 메이드 / 평균 시도)
      const twopPct = row.twopa_avg > 0 ? (row.twopm_avg / row.twopa_avg) * 100 : 0;
      const threepPct = row.threepa_avg > 0 ? (row.threepm_avg / row.threepa_avg) * 100 : 0;
      const ftPct = row.fta_avg > 0 ? (row.ftm_avg / row.fta_avg) * 100 : 0;

      // 고급 지표 (평균값 기반 — 비율 지표는 평균/합 동일)
      const fgmA = num(row.twopm_avg) + num(row.threepm_avg);
      const fgaA = num(row.twopa_avg) + num(row.threepa_avg);
      const ftmA = num(row.ftm_avg), ftaA = num(row.fta_avg);
      const ptsA = num(row.pts), orebA = num(row.oreb), drebA = num(row.dreb);
      const astA = num(row.ast), stlA = num(row.stl), blkA = num(row.blk), pfA = num(row.pf), toA = num(row.turnover);
      const efgPct = fgaA > 0 ? ((fgmA + 0.5 * num(row.threepm_avg)) / fgaA) * 100 : 0;
      const tsDen = 2 * (fgaA + 0.44 * ftaA);
      const tsPct = tsDen > 0 ? (ptsA / tsDen) * 100 : 0;
      const gameScore =
        ptsA + 0.4 * fgmA - 0.7 * fgaA - 0.4 * (ftaA - ftmA) +
        0.7 * orebA + 0.3 * drebA + stlA + 0.7 * astA + 0.7 * blkA - 0.4 * pfA - toA;
      const eff = ptsA + (orebA + drebA) + astA + stlA + blkA - ((fgaA - fgmA) + (ftaA - ftmA) + toA);
      const pm = pmMap.get(row.user_id) || 0;

      return {
        no: index + 1,
        userId: user?.id || row.user_id,
        userName: user?.name || `선수${row.user_id}`,
        userImage: teamMember?.image_url || null,
        gp: gp,
        w: w,
        l: l,
        pts: ptsA.toFixed(1),
        fgPct: parseFloat(row.fg_pct || 0).toFixed(1),
        twopPct: twopPct.toFixed(1),
        threepPct: threepPct.toFixed(1),
        ftPct: ftPct.toFixed(1),
        reb: num(row.reb).toFixed(1),
        ast: astA.toFixed(1),
        stl: stlA.toFixed(1),
        blk: blkA.toFixed(1),
        turnover: toA.toFixed(1),
        pf: pfA.toFixed(1),
        dd2: parseInt(row.dd2 || 0),
        td3: parseInt(row.td3 || 0),
        // 총 시도 수(최소 시도 필터용) — 평균×경기수 = 합계
        fga: Math.round(fgaA * gp),
        threepa: Math.round(num(row.threepa_avg) * gp),
        fta: Math.round(ftaA * gp),
        // 고급 지표
        efgPct: efgPct.toFixed(1),
        tsPct: tsPct.toFixed(1),
        gameScore: gameScore.toFixed(1),
        eff: eff.toFixed(1),
        plusMinus: pm, // 총 득실 마진
        pmPerGame: gp > 0 ? pm / gp : 0, // 경기당 +/-
        pie: pieMap.get(row.user_id) || 0, // 종합 임팩트(%)
      };
    });

    return res.status(200).json({ success: true, data: formattedRecords });
  } catch (err) {
    logger.error('기록 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`기록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 듀오 랭킹 조회
/**
 * @swagger
 * /team/rankings/duos:
 *   get:
 *     summary: 듀오 랭킹 조회 (승률 기준)
 *     tags:
 *       - Team
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         required: true
 *         description: 연도
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [best, worst]
 *         description: best(최고 듀오), worst(최악 듀오)
 *     responses:
 *       200:
 *         description: 듀오 랭킹 조회 성공
 */
const getDuoRankings = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { year, type = 'best' } = req.query;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        is_default: 1,
        is_active: 1,
      },
      include: [
        {
          model: Team,
          as: 'team',
        },
      ],
    });

    if (!teamMember || !teamMember.team) {
      return res.status(200).json({ success: true, data: [] });
    }

    const teamId = teamMember.team.id;

    // year 있으면 해당 연도, 없으면 전체 누적
    const dateFilter = year
      ? { created_at: { [Op.between]: [new Date(`${year}-01-01`), new Date(`${year}-12-31 23:59:59`)] } }
      : {};

    // 함께 코트(on_court)에 있던 쿼터 기반 — 함께 뛴 시간(분)이 "함께함"의 기준
    const qRows = await BasketballMemberQuarterRecord.findAll({
      where: {
        team_id: teamId,
        squad_id: { [Op.ne]: null },
        user_id: { [Op.ne]: null },
        on_court: 1,
        ...dateFilter,
      },
      attributes: ['match_id', 'game_no', 'quarter', 'squad_id', 'user_id', 'minutes'],
      raw: true,
    });
    // 경기별 쿼터 길이(분) — minutes 미기록(0)이면 이 값으로 폴백
    const dMatchIds = [...new Set(qRows.map((r) => r.match_id))];
    const matchMinRows = dMatchIds.length
      ? await BasketballMatch.findAll({ where: { id: { [Op.in]: dMatchIds } }, attributes: ['id', 'quarter_minutes'], raw: true })
      : [];
    const minById = {};
    for (const m of matchMinRows) minById[m.id] = m.quarter_minutes || 10;

    // (경기·게임·쿼터·스쿼드) 셀별 코트 위 선수(+출전분) → 2인 조합의 함께 뛴 분·게임 집계
    const cell = {};
    for (const r of qRows) {
      const k = `${r.match_id}|${r.game_no || 1}|${r.quarter}|${r.squad_id}`;
      (cell[k] = cell[k] || []).push({ u: r.user_id, m: r.minutes || minById[r.match_id] || 10 });
    }
    const duoMap = {};
    const ensureDuo = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!duoMap[key]) duoMap[key] = { user1Id: Math.min(a, b), user2Id: Math.max(a, b), minutes: 0, wins: 0, games: 0, _gs: new Set() };
      return duoMap[key];
    };
    for (const k of Object.keys(cell)) {
      const [mid, gno, , sid] = k.split('|');
      const arr = cell[k];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const d = ensureDuo(arr[i].u, arr[j].u);
          d.minutes += Math.min(arr[i].m, arr[j].m); // 두 선수가 함께 뛴(겹친) 분 근사
          d._gs.add(`${mid}|${gno}|${sid}`);
        }
      }
    }
    // 게임 승패: match_records의 (경기·게임·스쿼드) is_win
    const mrRows = await BasketballMemberMatchRecord.findAll({
      where: { team_id: teamId, squad_id: { [Op.ne]: null }, ...dateFilter },
      attributes: ['match_id', 'game_no', 'squad_id', 'is_win'],
      group: ['match_id', 'game_no', 'squad_id', 'is_win'],
      raw: true,
    });
    const winMGS = {};
    for (const r of mrRows) {
      const k = `${r.match_id}|${r.game_no || 1}|${r.squad_id}`;
      if (parseInt(r.is_win)) winMGS[k] = 1;
      else if (!(k in winMGS)) winMGS[k] = 0;
    }
    for (const key of Object.keys(duoMap)) {
      const d = duoMap[key];
      d.games = d._gs.size;
      for (const g of d._gs) if (winMGS[g]) d.wins += 1;
      delete d._gs;
    }

    // 듀오 득실 마진(함께 on_court 쿼터의 마진 합)
    const marginCtx = await loadMarginContext(teamId, dateFilter);
    const duoPm = duoPlusMinus(marginCtx);

    // 어시스트 케미: 쿼터 기록의 assist_targets 집계 → 두 선수 간 서로 어시스트 총합
    const assistRows = await BasketballMemberQuarterRecord.findAll({
      where: { team_id: teamId, user_id: { [Op.ne]: null }, ...dateFilter },
      attributes: ['user_id', 'assist_targets'],
    });
    const duoAssist = {}; // `${min}-${max}` → 서로 어시 횟수
    for (const r of assistRows) {
      const targets = r.assist_targets; // getter가 JSON 파싱 { scorerUserId: count }
      if (!targets) continue;
      const passer = r.user_id;
      for (const [scorer, cnt] of Object.entries(targets)) {
        const s = parseInt(scorer);
        if (!s || s === passer) continue;
        const key = passer < s ? `${passer}-${s}` : `${s}-${passer}`;
        duoAssist[key] = (duoAssist[key] || 0) + (parseInt(cnt) || 0);
      }
    }

    // 자격: 함께 뛴 시간(분) 최소 기준 (게임 수보다 정확 — 조퇴/교체 반영)
    const MIN_DUO_MINUTES = 40; // 약 한 게임 분량 (조절 가능)
    // 듀오 점수 = 승률 + 마진 + 어시스트 케미 (자격자 내 0~100 정규화 후 가중합)
    const WIN_WEIGHT = 50; // 승률 지분
    const MARGIN_WEIGHT = 30; // 경기당 마진 지분
    const ASSIST_WEIGHT = 20; // 어시스트 케미 지분

    const qualified = Object.values(duoMap)
      .map((duo) => {
        const pm = duoPm.get(`${duo.user1Id}-${duo.user2Id}`) || 0;
        return {
          ...duo,
          winRate: duo.games > 0 ? (duo.wins / duo.games) * 100 : 0,
          plusMinus: pm,
          pmPerGame: duo.games > 0 ? pm / duo.games : 0,
          assists: duoAssist[`${duo.user1Id}-${duo.user2Id}`] || 0,
          assistsPerGame: duo.games > 0 ? (duoAssist[`${duo.user1Id}-${duo.user2Id}`] || 0) / duo.games : 0,
        };
      })
      .filter((duo) => duo.minutes >= MIN_DUO_MINUTES);

    // 자격자 내 정규화 (min~max → 0~100, 전부 같으면 50)
    const norm = (x, arr) => {
      const mn = Math.min(...arr);
      const mx = Math.max(...arr);
      return mx > mn ? ((x - mn) / (mx - mn)) * 100 : 50;
    };
    if (qualified.length) {
      const winRates = qualified.map((d) => d.winRate);
      const margins = qualified.map((d) => d.pmPerGame);
      const assists = qualified.map((d) => d.assistsPerGame);
      for (const d of qualified) {
        d.score =
          (WIN_WEIGHT * norm(d.winRate, winRates) +
            MARGIN_WEIGHT * norm(d.pmPerGame, margins) +
            ASSIST_WEIGHT * norm(d.assistsPerGame, assists)) /
          100;
      }
    }

    const duos = qualified
      .sort((a, b) =>
        type === 'best'
          ? b.score - a.score || b.minutes - a.minutes
          : a.score - b.score || b.minutes - a.minutes
      )
      .slice(0, 10);

    // 사용자 정보 조회
    const userIds = [...new Set(duos.flatMap((duo) => [duo.user1Id, duo.user2Id]))];
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'name'],
    });

    const teamMembers = await BasketballTeamMember.findAll({
      where: {
        team_id: teamId,
        user_id: { [Op.in]: userIds },
        is_active: 1,
      },
      attributes: ['user_id', 'image_url'],
    });

    const userMap = {};
    users.forEach((user) => {
      userMap[user.id] = user;
    });

    const teamMemberMap = {};
    teamMembers.forEach((tm) => {
      teamMemberMap[tm.user_id] = tm;
    });

    // 결과 포맷팅
    const formattedDuos = duos.map((duo, index) => {
      const user1 = userMap[duo.user1Id];
      const user2 = userMap[duo.user2Id];
      const member1 = teamMemberMap[duo.user1Id];
      const member2 = teamMemberMap[duo.user2Id];

      return {
        rank: index + 1,
        user1: {
          id: user1?.id || duo.user1Id,
          name: user1?.name || `선수${duo.user1Id}`,
          image: member1?.image_url || null,
        },
        user2: {
          id: user2?.id || duo.user2Id,
          name: user2?.name || `선수${duo.user2Id}`,
          image: member2?.image_url || null,
        },
        wins: duo.wins,
        losses: duo.games - duo.wins,
        games: duo.games,
        minutes: duo.minutes, // 함께 코트에 있던 총 시간(분)
        winRate: duo.winRate.toFixed(1),
        plusMinus: duo.plusMinus, // 함께 뛸 때 총 득실 마진
        pmPerGame: Number(duo.pmPerGame.toFixed(1)),
        assists: duo.assists, // 서로 연결한 어시스트 총합
        score: Number((duo.score ?? 0).toFixed(1)), // 승률+마진+어시케미 가중 점수(정렬 기준)
      };
    });

    return res.status(200).json({ success: true, data: formattedDuos });
  } catch (err) {
    logger.error('듀오 랭킹 조회 에러:', err);
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadGatewayError(`듀오 랭킹 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 권한 체크 헬퍼 함수 (admin, developer, 또는 team의 leader/manager)
const checkManagementPermission = async (userId) => {
  // User role 확인
  const user = await User.findByPk(userId);
  if (!user) {
    throw new BadRequestError('사용자 정보가 없습니다.');
  }

  // admin 또는 developer는 모든 팀 관리 가능
  if (['admin', 'developer'].includes(user.role)) {
    return { hasPermission: true, isAdmin: true };
  }

  // 기본 팀의 leader 또는 manager 확인
  const teamMember = await BasketballTeamMember.findOne({
    where: {
      user_id: userId,
      is_default: 1,
      is_active: 1,
    },
    include: [{ model: Team, as: 'team' }],
  });

  if (!teamMember || !teamMember.team) {
    return { hasPermission: false, teamId: null };
  }

  if (['manager', 'leader'].includes(teamMember.role)) {
    return { hasPermission: true, isAdmin: false, teamId: teamMember.team.id };
  }

  return { hasPermission: false, teamId: null };
};

// 팀 관리 - 회원 명부 및 회비 조회
const getTeamManagement = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 권한 체크
    const permission = await checkManagementPermission(userId);
    if (!permission.hasPermission) {
      throw new UnauthorizedError('팀 관리 권한이 없습니다.');
    }

    // admin/developer인 경우 기본 팀 조회
    let teamId;
    if (permission.isAdmin) {
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          is_default: 1,
          is_active: 1,
        },
        include: [{ model: Team, as: 'team' }],
      });

      if (!teamMember || !teamMember.team) {
        return res.status(200).json({ success: true, data: [] });
      }
      teamId = teamMember.team.id;
    } else {
      teamId = permission.teamId;
    }

    // 팀 전체 회원 조회
    const members = await BasketballTeamMember.findAll({
      where: {
        team_id: teamId,
        is_active: 1,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'gender'],
        },
      ],
      order: [
        ['role', 'DESC'], // leader, manager, member 순
        ['created_at', 'ASC'],
      ],
    });

    // 회비 정보 조회 (미납: 전체, 납부완료: 최근 1년)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const dues = await TeamDue.findAll({
      where: {
        team_id: teamId,
        [Op.or]: [
          { is_paid: 0 }, // 미납은 전체 조회
          {
            is_paid: 1,
            paid_at: {
              [Op.gte]: oneYearAgo, // 납부완료는 최근 1년
            },
          },
        ],
      },
      order: [
        ['is_paid', 'ASC'],
        ['year', 'DESC'],
        ['month', 'DESC'],
      ],
    });

    // 회원별로 회비 정보 매핑
    const memberData = members.map((member, index) => {
      const user = member.user;
      const memberDues = dues.filter((due) => due.user_id === user.id);
      const unpaidDues = memberDues.filter((due) => !due.is_paid);
      const paidDues = memberDues.filter((due) => due.is_paid);

      return {
        no: index + 1,
        userId: user.id,
        name: user.name,
        gender: user.gender === 'male' ? '남' : user.gender === 'female' ? '여' : '-',
        phone: user.phone || '-',
        role: member.role,
        position: member.position || '-',
        activityScore: member.activity_score,
        lastAttendedAt: member.last_attended_at
          ? new Date(member.last_attended_at).toISOString().split('T')[0]
          : '-',
        isActive: member.is_active === 1,
        unpaidMonths: unpaidDues.length,
        unpaidDetails: unpaidDues.map((due) => ({
          id: due.id,
          year: due.year,
          month: due.month,
          amount: due.amount,
          reason: due.reason || '정기회비',
          isPaid: false,
        })),
        paidDetails: paidDues.map((due) => ({
          id: due.id,
          year: due.year,
          month: due.month,
          amount: due.amount,
          reason: due.reason || '정기회비',
          isPaid: true,
          paidAt: due.paid_at,
        })),
      };
    });

    return res.status(200).json({ success: true, data: memberData });
  } catch (err) {
    logger.error('팀 관리 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`팀 관리 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 회비 전체 내역 조회 (기간 제한 없음, 선택적으로 특정 회원)
const getDuesHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const targetUserId = req.query?.userId ? parseInt(req.query.userId) : null;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 권한 체크
    const permission = await checkManagementPermission(userId);
    if (!permission.hasPermission) {
      throw new UnauthorizedError('회비 조회 권한이 없습니다.');
    }

    // admin/developer인 경우 기본 팀 조회
    let teamId;
    if (permission.isAdmin) {
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          is_default: 1,
          is_active: 1,
        },
        include: [{ model: Team, as: 'team' }],
      });

      if (!teamMember || !teamMember.team) {
        return res.status(200).json({ success: true, data: [] });
      }
      teamId = teamMember.team.id;
    } else {
      teamId = permission.teamId;
    }

    const where = {
      team_id: teamId,
    };
    if (targetUserId) {
      where.user_id = targetUserId;
    }

    const dues = await TeamDue.findAll({
      where,
      order: [
        ['is_paid', 'ASC'],
        ['year', 'DESC'],
        ['month', 'DESC'],
      ],
    });

    const data = dues.map((due) => ({
      id: due.id,
      userId: due.user_id,
      year: due.year,
      month: due.month,
      amount: due.amount,
      reason: due.reason || '정기회비',
      isPaid: !!due.is_paid,
      paidAt: due.paid_at,
      createdAt: due.created_at,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error('회비 전체 내역 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`회비 내역 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 회비 납부 처리
const updateDuePayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dueId, isPaid, memo } = req.body;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 권한 체크
    const permission = await checkManagementPermission(userId);
    if (!permission.hasPermission) {
      throw new UnauthorizedError('회비 처리 권한이 없습니다.');
    }

    // admin/developer인 경우 기본 팀 조회
    let teamId;
    if (permission.isAdmin) {
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          is_default: 1,
          is_active: 1,
        },
        include: [{ model: Team, as: 'team' }],
      });

      if (!teamMember || !teamMember.team) {
        throw new BadRequestError('가입된 팀이 없습니다.');
      }
      teamId = teamMember.team.id;
    } else {
      teamId = permission.teamId;
    }

    const due = await TeamDue.findOne({
      where: {
        id: dueId,
        team_id: teamId,
      },
    });

    if (!due) {
      throw new BadRequestError('회비 정보를 찾을 수 없습니다.');
    }

    // 납부 상태 업데이트
    await due.update({
      is_paid: isPaid ? 1 : 0,
      paid_at: isPaid ? new Date() : null,
      paid_by: isPaid ? userId : null,
      memo: memo || due.memo,
    });

    return res.status(200).json({
      success: true,
      message: '회비 정보가 업데이트되었습니다.',
      data: due,
    });
  } catch (err) {
    logger.error('회비 납부 처리 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`회비 납부 처리 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 회비 생성 (전체 또는 개별)
const createMonthlyDues = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { year, month, amount, targetUserId, reason } = req.body;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    if (!year || !month || !amount) {
      throw new BadRequestError('연도, 월, 금액은 필수입니다.');
    }

    // 권한 체크
    const permission = await checkManagementPermission(userId);
    if (!permission.hasPermission) {
      throw new UnauthorizedError('회비 생성 권한이 없습니다.');
    }

    // admin/developer인 경우 기본 팀 조회
    let teamId;
    if (permission.isAdmin) {
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          is_default: 1,
          is_active: 1,
        },
        include: [{ model: Team, as: 'team' }],
      });

      if (!teamMember || !teamMember.team) {
        throw new BadRequestError('가입된 팀이 없습니다.');
      }
      teamId = teamMember.team.id;
    } else {
      teamId = permission.teamId;
    }

    // 개별 회비 생성
    if (targetUserId) {
      // 해당 회원이 팀에 속해있는지 확인
      const targetMember = await BasketballTeamMember.findOne({
        where: {
          team_id: teamId,
          user_id: targetUserId,
          is_active: 1,
        },
      });

      if (!targetMember) {
        throw new BadRequestError('해당 회원을 찾을 수 없습니다.');
      }

      const [due, created] = await TeamDue.findOrCreate({
        where: {
          team_id: teamId,
          user_id: targetUserId,
          year: parseInt(year),
          month: parseInt(month),
        },
        defaults: {
          amount: parseInt(amount),
          is_paid: 0,
          reason: reason || '정기회비',
        },
      });

      if (!created) {
        throw new BadRequestError('이미 해당 월의 회비가 존재합니다.');
      }

      return res.status(200).json({
        success: true,
        message: `${year}년 ${month}월 회비가 생성되었습니다.`,
        data: due,
      });
    }

    // 전체 회비 생성
    const members = await BasketballTeamMember.findAll({
      where: {
        team_id: teamId,
        is_active: 1,
      },
    });

    // 각 회원별로 회비 생성 (이미 있으면 스킵)
    const createdDues = [];
    for (const member of members) {
      const [due, created] = await TeamDue.findOrCreate({
        where: {
          team_id: teamId,
          user_id: member.user_id,
          year: parseInt(year),
          month: parseInt(month),
        },
        defaults: {
          amount: parseInt(amount),
          is_paid: 0,
          reason: reason || '정기회비',
        },
      });

      if (created) {
        createdDues.push(due);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${year}년 ${month}월 회비가 생성되었습니다.`,
      data: {
        created: createdDues.length,
        total: members.length,
      },
    });
  } catch (err) {
    logger.error('회비 생성 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`회비 생성 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 가입 신청 목록 조회
const getJoinRequests = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 권한 체크
    const permission = await checkManagementPermission(userId);
    if (!permission.hasPermission) {
      throw new UnauthorizedError('가입 신청 조회 권한이 없습니다.');
    }

    // admin/developer인 경우 기본 팀 조회
    let teamId;
    if (permission.isAdmin) {
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          is_default: 1,
          is_active: 1,
        },
        include: [{ model: Team, as: 'team' }],
      });

      if (!teamMember || !teamMember.team) {
        return res.status(200).json({ success: true, data: [] });
      }
      teamId = teamMember.team.id;
    } else {
      teamId = permission.teamId;
    }

    // 가입 신청 목록 조회
    const joinRequests = await JoinRequest.findAll({
      where: {
        team_id: teamId,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'gender'],
        },
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name'],
        },
      ],
      order: [['applied_at', 'DESC']],
    });

    const requestsData = joinRequests.map((request) => ({
      id: request.id,
      userId: request.user.id,
      userName: request.user.name,
      userEmail: request.user.email,
      userPhone: request.user.phone || '-',
      userGender:
        request.user.gender === 'male' ? '남' : request.user.gender === 'female' ? '여' : '-',
      appliedAt: request.applied_at,
      teamId: request.team.id,
      teamName: request.team.name,
    }));

    return res.status(200).json({ success: true, data: requestsData });
  } catch (err) {
    logger.error('가입 신청 목록 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`가입 신청 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 가입 신청 승인
const approveJoinRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 권한 체크
    const permission = await checkManagementPermission(userId);
    if (!permission.hasPermission) {
      throw new UnauthorizedError('가입 신청 승인 권한이 없습니다.');
    }

    // admin/developer인 경우 기본 팀 조회
    let teamId;
    if (permission.isAdmin) {
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          is_default: 1,
          is_active: 1,
        },
        include: [{ model: Team, as: 'team' }],
      });

      if (!teamMember || !teamMember.team) {
        throw new BadRequestError('가입된 팀이 없습니다.');
      }
      teamId = teamMember.team.id;
    } else {
      teamId = permission.teamId;
    }

    // 가입 신청 조회
    const joinRequest = await JoinRequest.findOne({
      where: {
        id,
        team_id: teamId,
      },
      include: [{ model: User, as: 'user' }],
    });

    if (!joinRequest) {
      throw new BadRequestError('가입 신청을 찾을 수 없습니다.');
    }

    // 이미 팀원인지 확인
    const existingMember = await BasketballTeamMember.findOne({
      where: {
        team_id: teamId,
        user_id: joinRequest.user_id,
        is_active: 1,
      },
    });

    if (existingMember) {
      // 이미 팀원이면 가입 신청 삭제
      await joinRequest.destroy();
      throw new BadRequestError('이미 해당 팀의 멤버입니다.');
    }

    // 팀원으로 추가
    await BasketballTeamMember.create({
      team_id: teamId,
      user_id: joinRequest.user_id,
      role: 'member',
      is_active: 1,
      is_default: 0,
    });

    // 가입 신청 삭제
    await joinRequest.destroy();

    return res.status(200).json({
      success: true,
      message: '가입 신청이 승인되었습니다.',
    });
  } catch (err) {
    logger.error('가입 신청 승인 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`가입 신청 승인 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 가입 신청 거절
const rejectJoinRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    // 권한 체크
    const permission = await checkManagementPermission(userId);
    if (!permission.hasPermission) {
      throw new UnauthorizedError('가입 신청 거절 권한이 없습니다.');
    }

    // admin/developer인 경우 기본 팀 조회
    let teamId;
    if (permission.isAdmin) {
      const teamMember = await BasketballTeamMember.findOne({
        where: {
          user_id: userId,
          is_default: 1,
          is_active: 1,
        },
        include: [{ model: Team, as: 'team' }],
      });

      if (!teamMember || !teamMember.team) {
        throw new BadRequestError('가입된 팀이 없습니다.');
      }
      teamId = teamMember.team.id;
    } else {
      teamId = permission.teamId;
    }

    // 가입 신청 조회
    const joinRequest = await JoinRequest.findOne({
      where: {
        id,
        team_id: teamId,
      },
    });

    if (!joinRequest) {
      throw new BadRequestError('가입 신청을 찾을 수 없습니다.');
    }

    // 가입 신청 삭제
    await joinRequest.destroy();

    return res.status(200).json({
      success: true,
      message: '가입 신청이 거절되었습니다.',
    });
  } catch (err) {
    logger.error('가입 신청 거절 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`가입 신청 거절 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 경기 생성
/**
 * @swagger
 * /team/match:
 *   post:
 *     summary: 경기 생성
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
 *               - title
 *               - match_date
 *               - type
 *             properties:
 *               team_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               match_date:
 *                 type: string
 *                 format: date
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [intra_squad, invitation, pickup, training, tournament]
 *               total_players:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 경기 생성 성공
 */
const createMatch = async (req, res) => {
  const t = await sequelize.transaction();
  let committed = false;
  try {
    const userId = req.user?.id;
    const { team_id, title, match_date, location, type, quarter_count, quarter_minutes } = req.body;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    if (!team_id || !title || !match_date) {
      throw new BadRequestError('필수 정보가 누락되었습니다.');
    }

    await assertTeamManager(userId, team_id, req.user?.role);

    // 경기 생성 (예정 상태)
    const match = await BasketballMatch.create(
      {
        team_id: parseInt(team_id),
        title: title.trim(),
        match_date: new Date(match_date),
        location: location || '',
        type: type || 'intra_squad',
        total_players: 0,
        quarter_count: Math.min(Math.max(toInt(quarter_count) || 4, 1), 12),
        quarter_minutes: Math.min(Math.max(toInt(quarter_minutes) || 10, 1), 60),
        status: 'scheduled',
      },
      { transaction: t }
    );

    // 참석투표 자동 생성: 팀 활성 멤버 전원 pending
    const activeMembers = await BasketballTeamMember.findAll({
      where: { team_id: parseInt(team_id), is_active: 1 },
      attributes: ['user_id'],
      transaction: t,
    });
    if (activeMembers.length > 0) {
      await BasketballMatchAttendance.bulkCreate(
        activeMembers.map((m) => ({ match_id: match.id, user_id: m.user_id, status: 'pending' })),
        { transaction: t }
      );
    }

    await t.commit();
    committed = true;
    return res.status(200).json({ success: true, data: match.dataValues });
  } catch (err) {
    if (!committed) await t.rollback();
    logger.error('경기 생성 에러:', err);
    if (
      err instanceof BadRequestError ||
      err instanceof UnauthorizedError ||
      err instanceof ForbiddenError
    ) {
      throw err;
    }
    throw new BadGatewayError(`경기 생성 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 경기 기록 저장
/**
 * @swagger
 * /team/match-record:
 *   post:
 *     summary: 경기 기록 저장
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
 *               - match_id
 *               - user_id
 *             properties:
 *               team_id:
 *                 type: integer
 *               match_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *               fgm:
 *                 type: integer
 *               fga:
 *                 type: integer
 *               threepm:
 *                 type: integer
 *               threepa:
 *                 type: integer
 *               ftm:
 *                 type: integer
 *               fta:
 *                 type: integer
 *               oreb:
 *                 type: integer
 *               dreb:
 *                 type: integer
 *               reb:
 *                 type: integer
 *               ast:
 *                 type: integer
 *               stl:
 *                 type: integer
 *               blk:
 *                 type: integer
 *               pf:
 *                 type: integer
 *               turnover:
 *                 type: integer
 *               pts:
 *                 type: integer
 *               is_win:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 경기 기록 저장 성공
 */
const createMatchRecord = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      team_id,
      match_id,
      user_id,
      fgm,
      fga,
      threepm,
      threepa,
      ftm,
      fta,
      oreb,
      dreb,
      reb,
      ast,
      stl,
      blk,
      pf,
      turnover,
      pts,
      is_win,
    } = req.body;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    if (!team_id || !match_id || !user_id) {
      throw new BadRequestError('필수 정보가 누락되었습니다.');
    }

    // 팀 멤버 확인
    const teamMember = await BasketballTeamMember.findOne({
      where: {
        user_id: userId,
        team_id: parseInt(team_id),
        is_active: 1,
      },
    });

    if (!teamMember) {
      throw new UnauthorizedError('해당 팀의 멤버가 아닙니다.');
    }

    // 통계 계산
    const fgmValue = parseInt(fgm) || 0;
    const fgaValue = parseInt(fga) || 0;
    const threepmValue = parseInt(threepm) || 0;
    const threepaValue = parseInt(threepa) || 0;
    const ftmValue = parseInt(ftm) || 0;
    const ftaValue = parseInt(fta) || 0;
    const orebValue = parseInt(oreb) || 0;
    const drebValue = parseInt(dreb) || 0;

    const twopm = fgmValue - threepmValue;
    const twopa = fgaValue - threepaValue;
    const rebValue = orebValue + drebValue;
    const ptsValue = twopm * 2 + threepmValue * 3 + ftmValue;

    // 성공률 계산
    const fgPct = fgaValue > 0 ? ((fgmValue / fgaValue) * 100).toFixed(2) : 0;
    const twopPct = twopa > 0 ? ((twopm / twopa) * 100).toFixed(2) : 0;
    const threepPct = threepaValue > 0 ? ((threepmValue / threepaValue) * 100).toFixed(2) : 0;
    const ftPct = ftaValue > 0 ? ((ftmValue / ftaValue) * 100).toFixed(2) : 0;

    // 더블더블, 트리플더블 체크
    let dd2 = 0;
    let td3 = 0;
    const stats = {
      pts: ptsValue,
      reb: rebValue,
      ast: parseInt(ast) || 0,
      stl: parseInt(stl) || 0,
      blk: parseInt(blk) || 0,
    };
    const doubleCount = Object.values(stats).filter((v) => v >= 10).length;
    if (doubleCount >= 2) dd2 = 1;
    if (doubleCount >= 3) td3 = 1;

    // 경기 기록 저장
    const record = await BasketballMemberMatchRecord.create({
      team_id: parseInt(team_id),
      match_id: parseInt(match_id),
      user_id: parseInt(user_id),
      fgm: fgmValue,
      fga: fgaValue,
      fg_pct: parseFloat(fgPct),
      twopm,
      twopa,
      twop_pct: parseFloat(twopPct),
      threepm: threepmValue,
      threepa: threepaValue,
      threep_pct: parseFloat(threepPct),
      ftm: ftmValue,
      fta: ftaValue,
      ft_pct: parseFloat(ftPct),
      oreb: orebValue,
      dreb: drebValue,
      reb: rebValue,
      ast: parseInt(ast) || 0,
      stl: parseInt(stl) || 0,
      blk: parseInt(blk) || 0,
      pf: parseInt(pf) || 0,
      turnover: parseInt(turnover) || 0,
      pts: ptsValue,
      is_win: is_win ? 1 : 0,
      dd2,
      td3,
    });

    return res.status(200).json({ success: true, data: record.dataValues });
  } catch (err) {
    logger.error('경기 기록 저장 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new BadGatewayError(`경기 기록 저장 중 오류가 발생했습니다: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// 라이브 경기 기록 (Redis 드래프트 → 종료 시 DB flush)
//  - 진행 중 스탯은 Redis에만 누적(이벤트당 DB insert 없음)
//  - 스쿼드 단위 키로 저장 → 여러 명이 각자 스쿼드를 동시에 기록해도 안 섞임
//  - 종료 시 쿼터별/합산 record를 트랜잭션으로 일괄 저장
// ─────────────────────────────────────────────────────────────
const LIVE_TTL = 60 * 60 * 24; // 24시간
const liveMetaKey = (matchId) => `live:${matchId}:meta`;
// 게임별 스탯 키 (하루 내 여러 게임). game 미지정 시 1게임.
const liveSquadKey = (matchId, squadId, game = 1) => `live:${matchId}:squad:${squadId}:g${game}`;

// 시작 시 기본 대진: Game 1(첫 두 스쿼드). 이후 "게임 추가"로 동적 확장.
const initialGameMatchups = (squadIds) =>
  Array.isArray(squadIds) && squadIds.length >= 2 ? { 1: [squadIds[0], squadIds[1]] } : {};
const liveActiveKey = (teamId) => `live:team:${teamId}:active`;

const STAT_FIELDS = [
  'fgm', 'fga', 'threepm', 'threepa', 'ftm', 'fta',
  'oreb', 'dreb', 'ast', 'stl', 'blk', 'turnover', 'pf',
];
const toInt = (v) => parseInt(v) || 0;
const blankStat = () => STAT_FIELDS.reduce((o, f) => ((o[f] = 0), o), {});

// 원시 스탯(성공/시도 카운트) → DB record 필드 계산 (createMatchRecord 로직과 동일)
const buildRecordFields = (stat) => {
  const fgm = toInt(stat.fgm);
  const fga = toInt(stat.fga);
  const threepm = toInt(stat.threepm);
  const threepa = toInt(stat.threepa);
  const ftm = toInt(stat.ftm);
  const fta = toInt(stat.fta);
  const oreb = toInt(stat.oreb);
  const dreb = toInt(stat.dreb);
  const twopm = Math.max(fgm - threepm, 0);
  const twopa = Math.max(fga - threepa, 0);
  const reb = oreb + dreb;
  const pts = twopm * 2 + threepm * 3 + ftm;
  const ast = toInt(stat.ast);
  const stl = toInt(stat.stl);
  const blk = toInt(stat.blk);
  const turnover = toInt(stat.turnover);
  const pf = toInt(stat.pf);
  const fg_pct = fga > 0 ? Number(((fgm / fga) * 100).toFixed(2)) : 0;
  const twop_pct = twopa > 0 ? Number(((twopm / twopa) * 100).toFixed(2)) : 0;
  const threep_pct = threepa > 0 ? Number(((threepm / threepa) * 100).toFixed(2)) : 0;
  const ft_pct = fta > 0 ? Number(((ftm / fta) * 100).toFixed(2)) : 0;
  const doubleCount = [pts, reb, ast, stl, blk].filter((v) => v >= 10).length;
  return {
    fgm, fga, fg_pct, twopm, twopa, twop_pct, threepm, threepa, threep_pct,
    ftm, fta, ft_pct, oreb, dreb, reb, ast, stl, blk, turnover, pf, pts,
    dd2: doubleCount >= 2 ? 1 : 0,
    td3: doubleCount >= 3 ? 1 : 0,
  };
};

const sumStats = (statList) => {
  const acc = blankStat();
  for (const s of statList) for (const f of STAT_FIELDS) acc[f] += toInt(s?.[f]);
  return acc;
};

// squadStats: { [quarter]: { [userId]: stat } } → 스쿼드 총 득점
const squadTotalPoints = (squadStats) => {
  let total = 0;
  for (const q of Object.keys(squadStats || {})) {
    for (const uid of Object.keys(squadStats[q] || {})) {
      total += buildRecordFields(squadStats[q][uid]).pts;
    }
  }
  return total;
};

// 3파전 이상: 쿼터별 기본 대진(라운드로빈 페어를 순환) → { [quarter]: [sqA, sqB] }
// 쿼터별 대진 기준 순위(승패)·쿼터 결과 계산 (라운드로빈)
// qrecs: 쿼터 레코드(squad_id, quarter, pts), matchups: { [quarter]: [a,b] }, squads: [{id}]
const buildStandings = (qrecs, matchups, squads) => {
  const ptsByQS = {}; // `${quarter}_${squadId}` → pts 합
  for (const r of qrecs) {
    const k = `${r.quarter}_${r.squad_id}`;
    ptsByQS[k] = (ptsByQS[k] || 0) + toInt(r.pts);
  }
  const stand = {};
  const init = (sid) =>
    stand[sid] || (stand[sid] = { squadId: sid, wins: 0, losses: 0, draws: 0, pf: 0, pa: 0, games: 0 });
  const quarterResults = [];
  const quarters = [...new Set(qrecs.map((r) => r.quarter))].sort((a, b) => a - b);
  for (const q of quarters) {
    let pair = matchups?.[q];
    if (!(Array.isArray(pair) && pair.length === 2)) {
      // 대진 미지정 시: 그 쿼터에 기록이 있는 스쿼드가 정확히 2개면 그걸로 추론
      const active = squads.map((s) => s.id).filter((sid) => ptsByQS[`${q}_${sid}`] !== undefined);
      if (active.length !== 2) continue;
      pair = active;
    }
    const [a, b] = pair.map(Number);
    const pa = ptsByQS[`${q}_${a}`] || 0;
    const pb = ptsByQS[`${q}_${b}`] || 0;
    init(a);
    init(b);
    stand[a].pf += pa; stand[a].pa += pb; stand[a].games++;
    stand[b].pf += pb; stand[b].pa += pa; stand[b].games++;
    let winner = null;
    if (pa > pb) { stand[a].wins++; stand[b].losses++; winner = a; }
    else if (pb > pa) { stand[b].wins++; stand[a].losses++; winner = b; }
    else { stand[a].draws++; stand[b].draws++; }
    quarterResults.push({ quarter: q, a, b, ptsA: pa, ptsB: pb, winner });
  }
  return { standings: stand, quarterResults };
};

// 쿼터별 득실(마진) 계산용 컨텍스트 로드 — +/- · Net · 듀오 마진 공용
// on_court=1 인 선수만 그 쿼터의 (득점 - 실점) 마진을 가짐
const loadMarginContext = async (teamId, dateFilter = {}) => {
  const qrecs = await BasketballMemberQuarterRecord.findAll({
    where: { team_id: parseInt(teamId), ...dateFilter },
    attributes: ['match_id', 'squad_id', 'quarter', 'user_id', 'pts', 'on_court'],
    raw: true,
  });
  const matchIds = [...new Set(qrecs.map((r) => r.match_id))];
  const matches = matchIds.length
    ? await BasketballMatch.findAll({ where: { id: { [Op.in]: matchIds } }, attributes: ['id', 'quarter_matchups'] })
    : [];
  const matchupMap = {};
  for (const m of matches) matchupMap[m.id] = m.quarter_matchups || null;

  const quarterPts = {}; // [match][quarter][squad] = 득점합
  const squadsByMatch = {}; // [match] = Set(squadId)
  for (const r of qrecs) {
    if (r.squad_id == null) continue;
    quarterPts[r.match_id] = quarterPts[r.match_id] || {};
    quarterPts[r.match_id][r.quarter] = quarterPts[r.match_id][r.quarter] || {};
    quarterPts[r.match_id][r.quarter][r.squad_id] =
      (quarterPts[r.match_id][r.quarter][r.squad_id] || 0) + toInt(r.pts);
    (squadsByMatch[r.match_id] = squadsByMatch[r.match_id] || new Set()).add(r.squad_id);
  }
  return { qrecs, matchupMap, quarterPts, squadsByMatch };
};

// 해당 쿼터 상대 스쿼드 id (대진 지정 우선, 미지정 2파전은 다른 스쿼드)
const opponentSquad = (ctx, matchId, quarter, squadId) => {
  const mu = ctx.matchupMap[matchId];
  if (mu && Array.isArray(mu[quarter]) && mu[quarter].length === 2) {
    const [a, b] = mu[quarter].map(Number);
    if (Number(squadId) === a) return b;
    if (Number(squadId) === b) return a;
    return null; // 이 쿼터 미출전 스쿼드
  }
  const squads = [...(ctx.squadsByMatch[matchId] || [])];
  if (squads.length === 2) return squads.find((s) => Number(s) !== Number(squadId));
  return null;
};
const quarterMargin = (ctx, matchId, quarter, squadId) => {
  const opp = opponentSquad(ctx, matchId, quarter, squadId);
  if (opp == null) return null;
  const pf = ctx.quarterPts[matchId]?.[quarter]?.[squadId] || 0;
  const pa = ctx.quarterPts[matchId]?.[quarter]?.[opp] || 0;
  return pf - pa;
};

// 선수별 +/- (on_court 쿼터의 마진 합)
const playerPlusMinus = (ctx) => {
  const pm = new Map();
  for (const r of ctx.qrecs) {
    if (r.user_id == null || !r.on_court) continue;
    const m = quarterMargin(ctx, r.match_id, r.quarter, r.squad_id);
    if (m == null) continue;
    pm.set(r.user_id, (pm.get(r.user_id) || 0) + m);
  }
  return pm;
};

// 듀오별 +/- (두 선수가 같은 스쿼드·같은 쿼터에 함께 on_court 일 때의 마진 합)
const duoPlusMinus = (ctx) => {
  const groups = {}; // match_squad_quarter -> { margin, users:[] }
  for (const r of ctx.qrecs) {
    if (r.user_id == null || !r.on_court) continue;
    const key = `${r.match_id}_${r.squad_id}_${r.quarter}`;
    if (!groups[key]) {
      const m = quarterMargin(ctx, r.match_id, r.quarter, r.squad_id);
      if (m == null) continue;
      groups[key] = { margin: m, users: [] };
    }
    groups[key].users.push(r.user_id);
  }
  const pm = new Map();
  for (const g of Object.values(groups)) {
    const us = [...new Set(g.users)].sort((a, b) => a - b);
    for (let i = 0; i < us.length; i++)
      for (let j = i + 1; j < us.length; j++)
        pm.set(`${us[i]}-${us[j]}`, (pm.get(`${us[i]}-${us[j]}`) || 0) + g.margin);
  }
  return pm;
};

const assertTeamMember = async (userId, teamId) => {
  const tm = await BasketballTeamMember.findOne({
    where: { user_id: userId, team_id: parseInt(teamId), is_active: 1 },
  });
  if (!tm) throw new UnauthorizedError('해당 팀의 멤버가 아닙니다.');
  return tm;
};

// 팀장/운영진(또는 전역 admin·developer)만 허용
const assertTeamManager = async (userId, teamId, globalRole) => {
  if (['admin', 'developer'].includes(globalRole)) return null;
  const tm = await assertTeamMember(userId, teamId);
  if (!['leader', 'manager'].includes(tm.role)) {
    throw new ForbiddenError('팀장 또는 운영진만 가능합니다.');
  }
  return tm;
};

// user_id → { user_id, name, image_url } 매핑
const buildMemberMap = async (teamId, userIds) => {
  const ids = [...new Set(userIds.map(Number))].filter(Boolean);
  const tms = await BasketballTeamMember.findAll({
    where: { team_id: parseInt(teamId), user_id: { [Op.in]: ids.length ? ids : [0] } },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
  });
  return new Map(
    tms.map((tm) => [tm.user_id, { user_id: tm.user_id, name: tm.user?.name, image_url: tm.image_url }])
  );
};

// Redis 드래프트가 만료/유실됐지만 경기가 'live'인 경우, DB 팀 구성으로 드래프트 재생성
// (스탯은 Redis에만 있었으므로 0으로 초기화되어 이어서 기록 가능)
const rebuildLiveDraft = async (match) => {
  const teamId = match.team_id;
  const squads = await BasketballMatchSquad.findAll({
    where: { match_id: match.id },
    order: [['id', 'ASC']],
  });
  if (!squads.length) return null;
  const squadMembers = await BasketballMatchSquadMember.findAll({
    where: { squad_id: { [Op.in]: squads.map((s) => s.id) } },
    order: [['id', 'ASC']],
  });
  const memberMap = await buildMemberMap(
    teamId,
    squadMembers.filter((sm) => sm.user_id != null).map((sm) => sm.user_id)
  );
  const bySquad = {};
  for (const sm of squadMembers) (bySquad[sm.squad_id] = bySquad[sm.squad_id] || []).push(sm);

  const qCount = match.quarter_count;
  let guestSeq = 0;
  const metaSquads = [];
  for (const s of squads) {
    const members = [];
    for (const sm of bySquad[s.id] || []) {
      if (sm.user_id != null) {
        const mm = memberMap.get(sm.user_id) || { name: `#${sm.user_id}` };
        members.push({ pid: `u${sm.user_id}`, userId: sm.user_id, name: mm.name, isGuest: false });
      } else {
        guestSeq += 1;
        members.push({ pid: `g${guestSeq}`, userId: null, name: sm.guest_name || `게스트${guestSeq}`, isGuest: true });
      }
    }
    metaSquads.push({ squadId: s.id, label: s.squad_label, members });
  }

  // 드래프트 유실 전 이미 확정 저장된 쿼터 복원
  const savedQrecs = await BasketballMemberQuarterRecord.findAll({
    where: { match_id: match.id },
    attributes: ['quarter'],
    group: ['quarter'],
  });
  const savedQuarters = savedQrecs.map((q) => q.quarter).sort((a, b) => a - b);

  const meta = {
    matchId: match.id,
    teamId,
    title: match.title,
    location: match.location,
    matchDate: new Date(match.match_date).toISOString(),
    startedAt: new Date().toISOString(),
    quarterCount: qCount,
    quarterMinutes: Array.from({ length: qCount }, () => match.quarter_minutes || 10),
    quarterMatchups: match.quarter_matchups || null, // 레거시(쿼터별)
    gameMatchups: match.game_matchups || initialGameMatchups(metaSquads.map((s) => s.squadId)),
    savedQuarters,
    squads: metaSquads,
  };
  await redisClient.set(liveMetaKey(match.id), JSON.stringify(meta), { EX: LIVE_TTL });
  const gameNos = Object.keys(meta.gameMatchups || {}).map(Number);
  const gamesToInit = gameNos.length ? gameNos : [1];
  for (const s of metaSquads) {
    const init = {};
    for (let q = 1; q <= qCount; q++) {
      init[q] = {};
      for (const m of s.members) init[q][m.pid] = blankStat();
    }
    for (const g of gamesToInit) {
      await redisClient.set(liveSquadKey(match.id, s.squadId, g), JSON.stringify(init), { EX: LIVE_TTL });
    }
  }
  await redisClient.sAdd(liveActiveKey(teamId), String(match.id));
  await redisClient.expire(liveActiveKey(teamId), LIVE_TTL);
  return meta;
};

const cleanupLive = async (matchId, teamId) => {
  const metaRaw = await redisClient.get(liveMetaKey(matchId));
  if (metaRaw) {
    const meta = JSON.parse(metaRaw);
    const gnos = Object.keys(meta.gameMatchups || {}).map(Number);
    const games = gnos.length ? gnos : [1];
    for (const s of meta.squads) for (const g of games) await redisClient.del(liveSquadKey(matchId, s.squadId, g));
  }
  await redisClient.del(liveMetaKey(matchId));
  if (teamId != null) await redisClient.sRem(liveActiveKey(teamId), String(matchId));
};

// 라이브 기록 시작: 기존 match에 스쿼드 구성 + Redis 드래프트 초기화
const startLiveOnMatch = async (req, res) => {
  const t = await sequelize.transaction();
  let committed = false;
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    const { squads, quarter_minutes } = req.body;

    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!Array.isArray(squads) || squads.length < 2) {
      throw new BadRequestError('최소 2개의 스쿼드가 필요합니다.');
    }

    const match = await BasketballMatch.findByPk(parseInt(matchId), { transaction: t });
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    if (match.status === 'completed') throw new BadRequestError('이미 종료된 경기입니다.');
    const team_id = match.team_id;
    await assertTeamMember(userId, team_id);

    const qCount = match.quarter_count;
    // 쿼터 분은 기록 시작 시 입력(미입력 시 기존값/기본 10분)
    const qMinutes = quarter_minutes != null
      ? Math.min(Math.max(toInt(quarter_minutes) || 10, 1), 60)
      : match.quarter_minutes;
    const matchDate = match.match_date;

    // 재구성 대비: 기존 스쿼드/멤버 제거
    const oldSquads = await BasketballMatchSquad.findAll({
      where: { match_id: match.id },
      transaction: t,
    });
    if (oldSquads.length) {
      await BasketballMatchSquadMember.destroy({
        where: { squad_id: { [Op.in]: oldSquads.map((s) => s.id) } },
        transaction: t,
      });
      await BasketballMatchSquad.destroy({ where: { match_id: match.id }, transaction: t });
      for (const s of oldSquads) await redisClient.del(liveSquadKey(match.id, s.id));
    }

    // 참가자 정규화: members = [{userId} | {guestName}] (구버전 memberUserIds도 허용)
    const normalized = squads.map((s) =>
      s.members || (s.memberUserIds || []).map((u) => ({ userId: u }))
    );
    const allUserIds = normalized
      .flat()
      .filter((m) => m && m.userId != null)
      .map((m) => Number(m.userId));
    const memberMap = await buildMemberMap(team_id, allUserIds);

    let guestSeq = 0;
    const squadMeta = [];
    for (let i = 0; i < squads.length; i++) {
      const label =
        squads[i].label && squads[i].label.trim() ? squads[i].label.trim() : String.fromCharCode(65 + i);
      const squad = await BasketballMatchSquad.create(
        { match_id: match.id, squad_label: label },
        { transaction: t }
      );
      const members = [];
      const seenU = new Set();
      for (const rm of normalized[i]) {
        if (rm.userId != null) {
          const uid = Number(rm.userId);
          if (!uid || seenU.has(uid)) continue;
          seenU.add(uid);
          await BasketballMatchSquadMember.create(
            { squad_id: squad.id, user_id: uid, guest_name: null },
            { transaction: t }
          );
          const mm = memberMap.get(uid) || { name: `#${uid}`, image_url: null };
          members.push({ pid: `u${uid}`, userId: uid, name: mm.name, image_url: mm.image_url || null, isGuest: false });
        } else if (rm.guestName != null && String(rm.guestName).trim()) {
          guestSeq += 1;
          const gname = String(rm.guestName).trim().slice(0, 64);
          await BasketballMatchSquadMember.create(
            { squad_id: squad.id, user_id: null, guest_name: gname },
            { transaction: t }
          );
          members.push({ pid: `g${guestSeq}`, userId: null, name: gname, image_url: null, isGuest: true });
        }
      }
      squadMeta.push({ squadId: squad.id, label, members });
    }

    // 대진은 쿼터마다 기록 화면에서 직접 선택 (자동 지정 안 함)
    const quarterMatchups = null;
    // 게임별 기본 대진 (2파전 A-B×3, 3파전 A-B/B-C/A-C ...) — 라이브에서 수정 가능
    const gameMatchups = initialGameMatchups(squadMeta.map((s) => s.squadId));

    await match.update(
      { status: 'live', quarter_minutes: qMinutes, quarter_matchups: quarterMatchups, game_matchups: gameMatchups },
      { transaction: t }
    );

    await t.commit();
    committed = true;

    // Redis 드래프트 초기화
    const meta = {
      matchId: match.id,
      teamId: parseInt(team_id),
      title: match.title,
      location: match.location,
      matchDate: matchDate.toISOString(),
      startedAt: new Date().toISOString(),
      quarterCount: qCount,
      // 쿼터별 시간(분) 배열 — 라이브 보드에서 쿼터마다 조절
      quarterMinutes: Array.from({ length: qCount }, () => qMinutes),
      // 쿼터별 대진 { [quarter]: [sqA, sqB] } (레거시)
      quarterMatchups,
      // 게임별 대진 { [gameNo]: [sqA, sqB] }
      gameMatchups,
      // 이미 DB에 저장(확정)된 쿼터 번호 목록 — 쿼터별 누적 저장
      savedQuarters: [],
      squads: squadMeta.map((s) => ({
        squadId: s.squadId,
        label: s.label,
        members: s.members.map((m) => ({ pid: m.pid, userId: m.userId, name: m.name, isGuest: m.isGuest })),
      })),
    };
    await redisClient.set(liveMetaKey(match.id), JSON.stringify(meta), { EX: LIVE_TTL });
    const gameNos = Object.keys(gameMatchups || {}).map(Number);
    const gamesToInit = gameNos.length ? gameNos : [1];
    for (const s of squadMeta) {
      const init = {};
      for (let q = 1; q <= qCount; q++) {
        init[q] = {};
        for (const m of s.members) init[q][m.pid] = blankStat();
      }
      for (const g of gamesToInit) {
        await redisClient.set(liveSquadKey(match.id, s.squadId, g), JSON.stringify(init), { EX: LIVE_TTL });
      }
    }
    await redisClient.sAdd(liveActiveKey(parseInt(team_id)), String(match.id));
    await redisClient.expire(liveActiveKey(parseInt(team_id)), LIVE_TTL);

    return res.status(200).json({
      success: true,
      data: { matchId: match.id, quarterCount: qCount, quarterMinutes: qMinutes, squads: squadMeta },
    });
  } catch (err) {
    if (!committed) await t.rollback();
    logger.error('라이브 경기 시작 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`라이브 경기 시작 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 진행 중인 라이브 경기 목록
const getActiveLiveMatches = async (req, res) => {
  try {
    const userId = req.user?.id;
    const teamId = req.query.team_id;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!teamId) throw new BadRequestError('팀 ID가 필요합니다.');
    await assertTeamMember(userId, teamId);

    const ids = await redisClient.sMembers(liveActiveKey(parseInt(teamId)));
    const games = [];
    for (const id of ids) {
      const metaRaw = await redisClient.get(liveMetaKey(id));
      if (!metaRaw) {
        await redisClient.sRem(liveActiveKey(parseInt(teamId)), id);
        continue;
      }
      const meta = JSON.parse(metaRaw);
      const squads = [];
      for (const s of meta.squads) {
        const statRaw = await redisClient.get(liveSquadKey(id, s.squadId));
        squads.push({
          squadId: s.squadId,
          label: s.label,
          memberCount: (s.members || []).length,
          points: statRaw ? squadTotalPoints(JSON.parse(statRaw)) : 0,
        });
      }
      games.push({
        matchId: Number(id),
        title: meta.title,
        startedAt: meta.startedAt,
        quarterCount: meta.quarterCount,
        quarterMinutes: meta.quarterMinutes,
        squads,
      });
    }
    return res.status(200).json({ success: true, data: games });
  } catch (err) {
    logger.error('라이브 경기 목록 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`라이브 경기 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 라이브 경기 드래프트 전체 조회 (재진입/합류/스코어보드)
const getLiveMatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');

    const metaRaw = await redisClient.get(liveMetaKey(matchId));
    let meta;
    if (metaRaw) {
      meta = JSON.parse(metaRaw);
    } else {
      // 드래프트 만료/유실: 경기가 live면 DB 구성으로 복구
      const match = await BasketballMatch.findByPk(parseInt(matchId));
      if (!match || match.status !== 'live') throw new BadRequestError('진행 중인 경기가 아닙니다.');
      await assertTeamMember(userId, match.team_id);
      meta = await rebuildLiveDraft(match);
      if (!meta) throw new BadRequestError('진행 중인 경기가 아닙니다.');
    }
    await assertTeamMember(userId, meta.teamId);
    const game = parseInt(req.query.game) || 1; // 조회 대상 게임(기본 1)

    // 저장 상태/기록 담당자 (DB 기준, 게임×스쿼드×쿼터 단위)
    const savedRows = await BasketballMemberQuarterRecord.findAll({
      where: { match_id: parseInt(matchId) },
      attributes: ['game_no', 'squad_id', 'quarter', 'recorded_by'],
      group: ['game_no', 'squad_id', 'quarter', 'recorded_by'],
    });
    const savedByGameSquad = {}; // { [game]: { [squadId]: { saved:Set, recorders:{} } } }
    for (const r of savedRows) {
      const g = r.game_no || 1;
      (savedByGameSquad[g] = savedByGameSquad[g] || {});
      if (!savedByGameSquad[g][r.squad_id]) savedByGameSquad[g][r.squad_id] = { saved: new Set(), recorders: {} };
      savedByGameSquad[g][r.squad_id].saved.add(r.quarter);
      if (r.recorded_by != null) savedByGameSquad[g][r.squad_id].recorders[r.quarter] = r.recorded_by;
    }
    const savedBySquad = savedByGameSquad[game] || {};

    const memberMap = await buildMemberMap(meta.teamId, [
      ...meta.squads.flatMap((s) => (s.members || []).filter((m) => m.userId != null).map((m) => m.userId)),
      ...savedRows.map((r) => r.recorded_by).filter((x) => x != null),
    ]);

    const squads = [];
    for (const s of meta.squads) {
      const statRaw = await redisClient.get(liveSquadKey(matchId, s.squadId, game));
      const sv = savedBySquad[s.squadId] || { saved: new Set(), recorders: {} };
      const recorders = {};
      for (const [q, uid] of Object.entries(sv.recorders)) {
        recorders[q] = { userId: uid, name: memberMap.get(uid)?.name || `#${uid}` };
      }
      squads.push({
        squadId: s.squadId,
        label: s.label,
        members: (s.members || []).map((m) => ({
          pid: m.pid,
          userId: m.userId,
          name: m.name,
          isGuest: m.isGuest,
          image_url: m.userId != null ? memberMap.get(m.userId)?.image_url || null : null,
        })),
        stats: statRaw ? JSON.parse(statRaw) : {},
        savedQuarters: [...sv.saved].sort((a, b) => a - b),
        recorders, // { [quarter]: { userId, name } }
      });
    }

    // 이 게임의 전 스쿼드 전 쿼터 저장 여부
    const allQuarters = Array.from({ length: meta.quarterCount }, (_, i) => i + 1);
    const gameSquadsSaved =
      meta.squads.length > 0 &&
      meta.squads.every((s) => {
        const saved = savedBySquad[s.squadId]?.saved || new Set();
        return allQuarters.every((n) => saved.has(n));
      });

    // 경기 종료 가능: 게임별 대진이 있으면 모든 게임의 대진 두 팀이 전 쿼터 저장 완료
    const gameMatchups = meta.gameMatchups || null;
    let allSquadsSaved;
    if (gameMatchups && Object.keys(gameMatchups).length) {
      allSquadsSaved = Object.entries(gameMatchups).every(([g, pair]) =>
        (pair || []).every((sid) => {
          const saved = savedByGameSquad[g]?.[sid]?.saved || new Set();
          return allQuarters.every((n) => saved.has(n));
        })
      );
    } else {
      allSquadsSaved = gameSquadsSaved;
    }

    return res.status(200).json({
      success: true,
      data: {
        matchId: Number(matchId),
        title: meta.title,
        quarterCount: meta.quarterCount,
        quarterMinutes: meta.quarterMinutes,
        quarterMatchups: meta.quarterMatchups || null,
        gameMatchups,
        game,
        gameSquadsSaved,
        allSquadsSaved,
        startedAt: meta.startedAt,
        squads,
      },
    });
  } catch (err) {
    logger.error('라이브 경기 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`라이브 경기 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 쿼터별 대진 지정 (3파전 이상) — 붙는 두 스쿼드 설정, Redis + DB 동기화
const setQuarterMatchup = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId, quarter } = req.params;
    const { squadIds } = req.body;
    const q = parseInt(quarter);
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!Array.isArray(squadIds) || squadIds.length !== 2 || squadIds[0] === squadIds[1]) {
      throw new BadRequestError('서로 다른 두 스쿼드를 지정해야 합니다.');
    }

    const metaRaw = await redisClient.get(liveMetaKey(matchId));
    if (!metaRaw) throw new BadRequestError('진행 중인 경기가 아닙니다.');
    const meta = JSON.parse(metaRaw);
    await assertTeamMember(userId, meta.teamId);
    if (!Number.isInteger(q) || q < 1 || q > meta.quarterCount) throw new BadRequestError('유효하지 않은 쿼터입니다.');
    const pair = squadIds.map(Number);
    if (!pair.every((sid) => meta.squads.some((s) => Number(s.squadId) === sid))) {
      throw new BadRequestError('스쿼드를 찾을 수 없습니다.');
    }

    const next = { ...(meta.quarterMatchups || {}), [q]: pair };
    meta.quarterMatchups = next;
    await redisClient.set(liveMetaKey(matchId), JSON.stringify(meta), { EX: LIVE_TTL });
    await BasketballMatch.update({ quarter_matchups: next }, { where: { id: parseInt(matchId) } });

    return res.status(200).json({ success: true, data: { quarter: q, squadIds: pair, quarterMatchups: next } });
  } catch (err) {
    logger.error('쿼터 대진 지정 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`쿼터 대진 지정 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 게임 추가 (하루 내 여러 게임) — 다음 게임 번호로 대진 추가
const addLiveGame = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    const { squadIds } = req.body; // 선택: 붙는 두 스쿼드. 없으면 첫 두 팀.
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');

    const metaRaw = await redisClient.get(liveMetaKey(matchId));
    let meta;
    if (metaRaw) meta = JSON.parse(metaRaw);
    else {
      const match = await BasketballMatch.findByPk(parseInt(matchId));
      if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
      await assertTeamMember(userId, match.team_id);
      meta = await rebuildLiveDraft(match);
      if (!meta) throw new BadRequestError('진행 중인 경기가 아닙니다.');
    }
    await assertTeamMember(userId, meta.teamId);

    const squadIdList = meta.squads.map((s) => s.squadId);
    const existing = Object.keys(meta.gameMatchups || {}).map(Number);
    const nextNo = existing.length ? Math.max(...existing) + 1 : 1;
    // 게임 수 상한: 2파전 최대 4게임, 그 외 최대 6게임
    const maxGames = squadIdList.length === 2 ? 4 : 6;
    if (existing.length >= maxGames) {
      throw new BadRequestError(`게임은 최대 ${maxGames}개까지 추가할 수 있습니다.`);
    }
    let pair;
    if (
      Array.isArray(squadIds) && squadIds.length === 2 &&
      Number(squadIds[0]) !== Number(squadIds[1]) &&
      squadIds.every((sid) => squadIdList.includes(Number(sid)))
    ) {
      pair = squadIds.map(Number);
    } else {
      pair = squadIdList.slice(0, 2);
    }

    meta.gameMatchups = { ...(meta.gameMatchups || {}), [nextNo]: pair };
    await redisClient.set(liveMetaKey(matchId), JSON.stringify(meta), { EX: LIVE_TTL });
    await BasketballMatch.update({ game_matchups: meta.gameMatchups }, { where: { id: parseInt(matchId) } });

    for (const s of meta.squads) {
      const init = {};
      for (let q = 1; q <= meta.quarterCount; q++) {
        init[q] = {};
        for (const m of s.members) init[q][m.pid] = blankStat();
      }
      await redisClient.set(liveSquadKey(matchId, s.squadId, nextNo), JSON.stringify(init), { EX: LIVE_TTL });
    }

    return res.status(200).json({ success: true, data: { game: nextNo, gameMatchups: meta.gameMatchups } });
  } catch (err) {
    logger.error('게임 추가 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`게임 추가 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 게임 대진 변경 (3파전+에서 이 게임에 붙는 두 팀 지정)
const setLiveGameMatchup = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId, game } = req.params;
    const { squadIds } = req.body;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!Array.isArray(squadIds) || squadIds.length !== 2 || Number(squadIds[0]) === Number(squadIds[1])) {
      throw new BadRequestError('서로 다른 두 스쿼드를 지정해야 합니다.');
    }
    const metaRaw = await redisClient.get(liveMetaKey(matchId));
    if (!metaRaw) throw new BadRequestError('진행 중인 경기가 아닙니다.');
    const meta = JSON.parse(metaRaw);
    await assertTeamMember(userId, meta.teamId);
    const pair = squadIds.map(Number);
    if (!pair.every((sid) => meta.squads.some((s) => Number(s.squadId) === sid))) {
      throw new BadRequestError('스쿼드를 찾을 수 없습니다.');
    }
    meta.gameMatchups = { ...(meta.gameMatchups || {}), [game]: pair };
    await redisClient.set(liveMetaKey(matchId), JSON.stringify(meta), { EX: LIVE_TTL });
    await BasketballMatch.update({ game_matchups: meta.gameMatchups }, { where: { id: parseInt(matchId) } });
    return res.status(200).json({ success: true, data: { game: Number(game), squadIds: pair, gameMatchups: meta.gameMatchups } });
  } catch (err) {
    logger.error('게임 대진 지정 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`게임 대진 지정 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 스쿼드 스탯 저장 (디바운스 자동저장) — 해당 스쿼드 전체 쿼터 JSON 덮어쓰기
const saveLiveSquad = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId, squadId } = req.params;
    const { stats } = req.body;
    const game = parseInt(req.query.game) || 1;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (typeof stats !== 'object' || stats === null) throw new BadRequestError('stats가 필요합니다.');

    const metaRaw = await redisClient.get(liveMetaKey(matchId));
    if (!metaRaw) throw new BadRequestError('진행 중인 경기가 아닙니다.');
    const meta = JSON.parse(metaRaw);
    await assertTeamMember(userId, meta.teamId);
    if (!meta.squads.some((s) => String(s.squadId) === String(squadId))) {
      throw new BadRequestError('스쿼드를 찾을 수 없습니다.');
    }

    await redisClient.set(liveSquadKey(matchId, squadId, game), JSON.stringify(stats), { EX: LIVE_TTL });
    await redisClient.expire(liveMetaKey(matchId), LIVE_TTL);
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('라이브 스쿼드 저장 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`라이브 스쿼드 저장 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 쿼터별 시간(분) 갱신 — 라이브 보드에서 쿼터마다 조절
const updateLiveQuarterMinutes = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    const { quarterMinutes } = req.body;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!Array.isArray(quarterMinutes)) throw new BadRequestError('quarterMinutes 배열이 필요합니다.');

    const metaRaw = await redisClient.get(liveMetaKey(matchId));
    if (!metaRaw) throw new BadRequestError('진행 중인 경기가 아닙니다.');
    const meta = JSON.parse(metaRaw);
    await assertTeamMember(userId, meta.teamId);

    meta.quarterMinutes = Array.from({ length: meta.quarterCount }, (_, i) => {
      const n = parseInt(quarterMinutes[i]);
      return Number.isNaN(n) ? 10 : Math.min(Math.max(n, 1), 60);
    });
    await redisClient.set(liveMetaKey(matchId), JSON.stringify(meta), { EX: LIVE_TTL });
    return res.status(200).json({ success: true, data: { quarterMinutes: meta.quarterMinutes } });
  } catch (err) {
    logger.error('쿼터 시간 갱신 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`쿼터 시간 갱신 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 저장된 쿼터 레코드로부터 합산(경기) 레코드 재계산 후 재생성 → 플레이어 수 반환
const recomputeMatchRecords = async (matchId, teamId, t) => {
  const qrecs = await BasketballMemberQuarterRecord.findAll({
    where: { match_id: parseInt(matchId) },
    transaction: t,
  });
  // 소유자(user_id/guest_name)별 합산
  const groups = new Map();
  for (const r of qrecs) {
    const key = r.user_id != null ? `u:${r.user_id}` : `g:${r.guest_name}`;
    let g = groups.get(key);
    if (!g) {
      g = { user_id: r.user_id ?? null, guest_name: r.user_id == null ? r.guest_name : null, squad_id: r.squad_id, stats: [] };
      groups.set(key, g);
    }
    g.stats.push(r);
  }
  // 스쿼드 총점 → 최고 득점 스쿼드 승(동점 공동승)
  const squadPts = {};
  const aggregates = [];
  for (const g of groups.values()) {
    const fields = buildRecordFields(sumStats(g.stats));
    aggregates.push({ ...g, fields });
    if (g.squad_id != null) squadPts[g.squad_id] = (squadPts[g.squad_id] || 0) + fields.pts;
  }
  const maxPts = Math.max(0, ...Object.values(squadPts));

  // 기존 합산 레코드 제거 후 재생성
  await BasketballMemberMatchRecord.destroy({ where: { match_id: parseInt(matchId) }, transaction: t });
  for (const a of aggregates) {
    const isWin = maxPts > 0 && a.squad_id != null && squadPts[a.squad_id] === maxPts ? 1 : 0;
    await BasketballMemberMatchRecord.create(
      {
        team_id: teamId,
        match_id: parseInt(matchId),
        squad_id: a.squad_id,
        user_id: a.user_id,
        guest_name: a.guest_name,
        is_win: isWin,
        ...a.fields,
      },
      { transaction: t }
    );
  }
  return aggregates.length;
};

// 특정 스쿼드의 합산(경기) 레코드만 재계산 (동시 저장 안전: 자기 스쿼드 행만 건드림)
// is_win 은 경기 종료 시 전 스쿼드 기준으로 확정하므로 여기선 0
const recomputeSquadMatchRecord = async (matchId, squadId, teamId, t, game = 1) => {
  const qrecs = await BasketballMemberQuarterRecord.findAll({
    where: { match_id: parseInt(matchId), squad_id: parseInt(squadId), game_no: game },
    transaction: t,
  });
  const groups = new Map();
  for (const r of qrecs) {
    const key = r.user_id != null ? `u:${r.user_id}` : `g:${r.guest_name}`;
    let g = groups.get(key);
    if (!g) {
      g = { user_id: r.user_id ?? null, guest_name: r.user_id == null ? r.guest_name : null, stats: [] };
      groups.set(key, g);
    }
    g.stats.push(r);
  }
  await BasketballMemberMatchRecord.destroy({
    where: { match_id: parseInt(matchId), squad_id: parseInt(squadId), game_no: game },
    transaction: t,
  });
  for (const g of groups.values()) {
    await BasketballMemberMatchRecord.create(
      {
        team_id: teamId,
        match_id: parseInt(matchId),
        squad_id: parseInt(squadId),
        game_no: game,
        user_id: g.user_id,
        guest_name: g.guest_name,
        is_win: 0,
        ...buildRecordFields(sumStats(g.stats)),
      },
      { transaction: t }
    );
  }
};

// 쿼터별 누적 저장 (스쿼드 단위) → 해당 스쿼드의 그 쿼터만 확정 저장
// 여러 스쿼드 담당자가 동시에 저장해도 서로의 행을 건드리지 않아 안전
// 저장한 사람이 그 쿼터의 기록 담당자(recorded_by)로 기록됨
const saveLiveQuarter = async (req, res) => {
  const t = await sequelize.transaction();
  let committed = false;
  try {
    const userId = req.user?.id;
    const { matchId, squadId, quarter } = req.params;
    const q = parseInt(quarter);
    const game = parseInt(req.query.game) || 1; // 게임 미지정 시 1게임
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');

    const metaRaw = await redisClient.get(liveMetaKey(matchId));
    let meta;
    if (metaRaw) {
      meta = JSON.parse(metaRaw);
    } else {
      const match = await BasketballMatch.findByPk(parseInt(matchId));
      if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
      await assertTeamMember(userId, match.team_id);
      meta = await rebuildLiveDraft(match);
      if (!meta) throw new BadRequestError('진행 중인 경기가 아닙니다.');
    }
    await assertTeamMember(userId, meta.teamId);
    if (!Number.isInteger(q) || q < 1 || q > meta.quarterCount) {
      throw new BadRequestError('유효하지 않은 쿼터입니다.');
    }
    const squad = meta.squads.find((s) => String(s.squadId) === String(squadId));
    if (!squad) throw new BadRequestError('스쿼드를 찾을 수 없습니다.');

    const statRaw = await redisClient.get(liveSquadKey(matchId, squad.squadId, game));
    const stats = statRaw ? JSON.parse(statRaw) : {};

    // 이 쿼터 코트 출전 라인업(pid 배열). 미지정이면 전원 출전으로 간주 → on_court=1
    const onCourt = Array.isArray(req.body?.onCourt) ? new Set(req.body.onCourt.map(String)) : null;
    // 이 쿼터 기본 출전 분 (라이브에서 정한 쿼터 분)
    const quarterLen = (Array.isArray(meta.quarterMinutes) && meta.quarterMinutes[q - 1]) || 10;

    // pid → userId 매핑 (어시스트 대상을 userId 기준으로 저장)
    const pidToUser = {};
    for (const mm of squad.members || []) if (mm.userId != null) pidToUser[String(mm.pid)] = mm.userId;

    // 이 스쿼드의 해당 게임·쿼터 레코드만 재작성 (다른 스쿼드/게임/쿼터는 미변경)
    await BasketballMemberQuarterRecord.destroy({
      where: { match_id: parseInt(matchId), squad_id: squad.squadId, game_no: game, quarter: q },
      transaction: t,
    });
    for (const m of squad.members || []) {
      const stat = stats?.[q]?.[m.pid] || blankStat();
      // 어시스트 대상(at): 스토어는 pid 기준 → 득점자 userId 기준으로 변환
      let assistTargets = null;
      if (stat.at && typeof stat.at === 'object') {
        const converted = {};
        for (const [scorerPid, cnt] of Object.entries(stat.at)) {
          const uid = pidToUser[String(scorerPid)];
          if (uid != null && cnt > 0) converted[uid] = (converted[uid] || 0) + cnt;
        }
        if (Object.keys(converted).length) assistTargets = converted;
      }
      await BasketballMemberQuarterRecord.create(
        {
          team_id: meta.teamId,
          match_id: parseInt(matchId),
          squad_id: squad.squadId,
          game_no: game,
          user_id: m.userId ?? null,
          guest_name: m.isGuest ? m.name : null,
          quarter: q,
          is_win: 0,
          recorded_by: userId, // 저장 누른 사람 = 기록 담당자
          on_court: onCourt ? (onCourt.has(String(m.pid)) ? 1 : 0) : 1,
          // 출전 분: 교체로 수동 입력(stat.min)했으면 그 값, 아니면 출전 시 쿼터 분
          minutes: stat.min != null
            ? Math.max(0, Math.min(parseInt(stat.min) || 0, quarterLen))
            : (onCourt ? (onCourt.has(String(m.pid)) ? quarterLen : 0) : quarterLen),
          assist_targets: assistTargets,
          ...buildRecordFields(stat),
        },
        { transaction: t }
      );
    }

    // 이 스쿼드·게임의 합산 레코드만 재계산
    await recomputeSquadMatchRecord(matchId, squad.squadId, meta.teamId, t, game);
    await t.commit();
    committed = true;

    // 이 스쿼드·게임의 저장된 쿼터 목록(DB 기준)
    const savedRows = await BasketballMemberQuarterRecord.findAll({
      where: { match_id: parseInt(matchId), squad_id: squad.squadId, game_no: game },
      attributes: ['quarter'],
      group: ['quarter'],
    });
    const savedQuarters = savedRows.map((r) => r.quarter).sort((a, b) => a - b);

    return res.status(200).json({
      success: true,
      data: { matchId: Number(matchId), squadId: Number(squad.squadId), game_no: game, quarter: q, savedQuarters },
    });
  } catch (err) {
    if (!committed) await t.rollback();
    logger.error('라이브 쿼터 저장 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`라이브 쿼터 저장 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 경기 종료 → 전 스쿼드×전 쿼터 저장 확인 후 승패 확정 + completed, Redis 정리
// (기록은 스쿼드별 쿼터 저장 시 이미 DB에 반영됨. 여기서 승패를 확정하고 상태만 바꿈)
const finishLiveMatch = async (req, res) => {
  const t = await sequelize.transaction();
  let committed = false;
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');

    const match = await BasketballMatch.findByPk(parseInt(matchId), { transaction: t });
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    await assertTeamMember(userId, match.team_id);

    const squads = await BasketballMatchSquad.findAll({
      where: { match_id: match.id },
      transaction: t,
    });
    if (!squads.length) throw new BadRequestError('스쿼드 구성이 없습니다.');
    const allQuarters = Array.from({ length: match.quarter_count }, (_, i) => i + 1);
    const gameMatchups = match.game_matchups || null;

    let totalPlayers;
    if (gameMatchups && Object.keys(gameMatchups).length) {
      // ── 게임 모델: 게임별 대진의 두 팀이 전 쿼터 저장됐는지 확인 후 게임별 승패 확정 ──
      const qrows = await BasketballMemberQuarterRecord.findAll({
        where: { match_id: match.id },
        attributes: ['game_no', 'squad_id', 'quarter'],
        group: ['game_no', 'squad_id', 'quarter'],
        transaction: t,
      });
      const savedByGameSquad = {};
      for (const r of qrows) {
        const g = r.game_no || 1;
        ((savedByGameSquad[g] = savedByGameSquad[g] || {})[r.squad_id] =
          savedByGameSquad[g][r.squad_id] || new Set()).add(r.quarter);
      }
      const everySaved = Object.entries(gameMatchups).every(([g, pair]) =>
        (pair || []).every((sid) => {
          const saved = savedByGameSquad[g]?.[sid] || new Set();
          return allQuarters.every((n) => saved.has(n));
        })
      );
      if (!everySaved) {
        throw new BadRequestError('모든 게임의 두 팀이 모든 쿼터를 저장해야 경기를 종료할 수 있습니다.');
      }
      // 게임별 승패: 그 게임 두 팀 중 총득점 높은 팀 승(동점 공동승)
      for (const [g, pair] of Object.entries(gameMatchups)) {
        const recs = await BasketballMemberMatchRecord.findAll({
          where: { match_id: match.id, game_no: g },
          transaction: t,
        });
        const pts = {};
        for (const r of recs) if (r.squad_id != null) pts[r.squad_id] = (pts[r.squad_id] || 0) + r.pts;
        const maxPts = Math.max(0, ...(pair || []).map((sid) => pts[sid] || 0));
        for (const r of recs) {
          const win = maxPts > 0 && pts[r.squad_id] === maxPts ? 1 : 0;
          if ((r.is_win ? 1 : 0) !== win) await r.update({ is_win: win }, { transaction: t });
        }
      }
      const owners = await BasketballMemberMatchRecord.findAll({
        where: { match_id: match.id },
        attributes: ['user_id', 'guest_name'],
        transaction: t,
      });
      totalPlayers = new Set(owners.map((r) => (r.user_id != null ? `u${r.user_id}` : `g${r.guest_name}`))).size;
    } else {
      // ── 레거시(게임 없음): 기존 로직 ──
      const qrows = await BasketballMemberQuarterRecord.findAll({
        where: { match_id: match.id },
        attributes: ['squad_id', 'quarter'],
        group: ['squad_id', 'quarter'],
        transaction: t,
      });
      const savedBySquad = {};
      for (const r of qrows) (savedBySquad[r.squad_id] = savedBySquad[r.squad_id] || new Set()).add(r.quarter);
      const everySaved = squads.every((s) => {
        const saved = savedBySquad[s.id] || new Set();
        return allQuarters.every((n) => saved.has(n));
      });
      if (!everySaved) {
        throw new BadRequestError('모든 팀이 모든 쿼터를 저장해야 경기를 종료할 수 있습니다.');
      }
      totalPlayers = await recomputeMatchRecords(matchId, match.team_id, t);
      if (squads.length >= 3) {
        const qrecs = await BasketballMemberQuarterRecord.findAll({
          where: { match_id: match.id },
          transaction: t,
        });
        const { standings } = buildStandings(qrecs, match.quarter_matchups, squads);
        const arr = Object.values(standings).sort(
          (a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf
        );
        await BasketballMemberMatchRecord.update({ is_win: 0 }, { where: { match_id: match.id }, transaction: t });
        if (arr.length && arr[0].games > 0) {
          await BasketballMemberMatchRecord.update(
            { is_win: 1 },
            { where: { match_id: match.id, squad_id: arr[0].squadId }, transaction: t }
          );
        }
      }
    }

    await match.update({ status: 'completed', total_players: totalPlayers }, { transaction: t });
    await t.commit();
    committed = true;

    await cleanupLive(matchId, match.team_id);
    return res.status(200).json({ success: true, data: { matchId: Number(matchId) } });
  } catch (err) {
    if (!committed) await t.rollback();
    logger.error('라이브 경기 종료 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`라이브 경기 종료 중 오류가 발생했습니다: ${err.message}`);
  }
};

// DB record 카운트 → 성공 슛 시퀀스 근사 복원 (순서는 저장되지 않으므로 값 기준 재구성)
const reconstructMakes = (r) => {
  const makes = [];
  const twopm = Math.max(toInt(r.fgm) - toInt(r.threepm), 0);
  for (let i = 0; i < twopm; i++) makes.push(2);
  for (let i = 0; i < toInt(r.threepm); i++) makes.push(3);
  for (let i = 0; i < toInt(r.ftm); i++) makes.push(1);
  return makes;
};

// 종료된 경기 기록 수정 — DB 기록을 Redis 라이브 드래프트로 복원 후 다시 live 전환
const reopenLiveMatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');

    const match = await BasketballMatch.findByPk(parseInt(matchId));
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    if (match.status !== 'completed') throw new BadRequestError('종료된 경기만 수정할 수 있습니다.');
    await assertTeamMember(userId, match.team_id);

    // 스쿼드/멤버 구성으로 드래프트(meta + 0 스탯) 재생성
    const meta = await rebuildLiveDraft(match);
    if (!meta) throw new BadRequestError('스쿼드 구성이 없어 수정할 수 없습니다.');

    // 저장된 쿼터 레코드로 스쿼드 스탯 시딩(0 → 실제 값)
    const qrecs = await BasketballMemberQuarterRecord.findAll({ where: { match_id: match.id } });
    for (const s of meta.squads) {
      const stats = {};
      for (let q = 1; q <= meta.quarterCount; q++) stats[q] = {};
      for (const m of s.members) {
        const rows = qrecs.filter(
          (r) =>
            r.squad_id === s.squadId &&
            (m.userId != null ? r.user_id === m.userId : r.user_id == null && r.guest_name === m.name)
        );
        for (const r of rows) {
          if (!stats[r.quarter]) stats[r.quarter] = {};
          stats[r.quarter][m.pid] = {
            fgm: toInt(r.fgm), fga: toInt(r.fga),
            threepm: toInt(r.threepm), threepa: toInt(r.threepa),
            ftm: toInt(r.ftm), fta: toInt(r.fta),
            oreb: toInt(r.oreb), dreb: toInt(r.dreb),
            ast: toInt(r.ast), stl: toInt(r.stl), blk: toInt(r.blk),
            turnover: toInt(r.turnover), pf: toInt(r.pf),
            makes: reconstructMakes(r),
          };
        }
      }
      await redisClient.set(liveSquadKey(match.id, s.squadId), JSON.stringify(stats), { EX: LIVE_TTL });
    }

    // 이미 저장된 쿼터 표시. 경기는 completed 유지(수정 후 저장 안 하고 나가도 완료 상태 보존)
    // → 라이브 보드는 Redis meta로 로드되므로 status 전환 불필요, '이어하기'가 아니라 '기록 수정'으로 유지
    meta.savedQuarters = [...new Set(qrecs.map((r) => r.quarter))].sort((a, b) => a - b);
    await redisClient.set(liveMetaKey(match.id), JSON.stringify(meta), { EX: LIVE_TTL });

    return res.status(200).json({ success: true, data: { matchId: Number(matchId) } });
  } catch (err) {
    logger.error('라이브 경기 재개(수정) 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`기록 수정 준비 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 라이브 드래프트 폐기 (경기는 유지, 스쿼드/드래프트만 제거 후 '예정'으로 복귀)
const discardLiveMatch = async (req, res) => {
  const t = await sequelize.transaction();
  let committed = false;
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');

    const match = await BasketballMatch.findByPk(parseInt(matchId), { transaction: t });
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    if (match.status === 'completed') throw new BadRequestError('이미 종료된 경기입니다.');
    const teamId = match.team_id;
    await assertTeamMember(userId, teamId);

    const squads = await BasketballMatchSquad.findAll({
      where: { match_id: parseInt(matchId) },
      transaction: t,
    });
    const squadIds = squads.map((s) => s.id);
    if (squadIds.length) {
      await BasketballMatchSquadMember.destroy({ where: { squad_id: { [Op.in]: squadIds } }, transaction: t });
    }
    await BasketballMatchSquad.destroy({ where: { match_id: parseInt(matchId) }, transaction: t });
    await match.update({ status: 'scheduled' }, { transaction: t });

    await t.commit();
    committed = true;
    await cleanupLive(matchId, teamId);
    return res.status(200).json({ success: true });
  } catch (err) {
    if (!committed) await t.rollback();
    logger.error('라이브 드래프트 폐기 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`라이브 드래프트 폐기 중 오류가 발생했습니다: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// 매치(경기) 목록 / 상세 / 참석투표 / 삭제
// ─────────────────────────────────────────────────────────────
const ATT_STATUSES = ['attend', 'absent', 'pending'];

// 경기 목록 (연/월/멤버/상태 필터)
const getMatches = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { team_id, year, month, member, status } = req.query;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!team_id) throw new BadRequestError('팀 ID가 필요합니다.');
    await assertTeamMember(userId, team_id);

    // 정기 경기 자동 생성 보장(지연 생성)
    await ensureTeamSchedules(parseInt(team_id));

    const where = { team_id: parseInt(team_id) };
    if (status && ['scheduled', 'live', 'completed'].includes(status)) where.status = status;
    if (year) {
      const y = parseInt(year);
      if (month) {
        const m = parseInt(month);
        where.match_date = { [Op.gte]: new Date(y, m - 1, 1), [Op.lt]: new Date(y, m, 1) };
      } else {
        where.match_date = { [Op.gte]: new Date(y, 0, 1), [Op.lt]: new Date(y + 1, 0, 1) };
      }
    }

    let matches = await BasketballMatch.findAll({ where, order: [['match_date', 'DESC']] });

    // 멤버 이름 필터: 그 멤버가 참석(attend)했거나 기록이 있는 경기만
    if (member && member.trim()) {
      const memTms = await BasketballTeamMember.findAll({
        where: { team_id: parseInt(team_id), is_active: 1 },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
            where: { name: { [Op.like]: `%${member.trim()}%` } },
          },
        ],
      });
      const memUserIds = memTms.map((tm) => tm.user_id);
      const matchIds = matches.map((m) => m.id);
      if (memUserIds.length === 0 || matchIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
      const [attRows, recRows] = await Promise.all([
        BasketballMatchAttendance.findAll({
          where: { match_id: { [Op.in]: matchIds }, user_id: { [Op.in]: memUserIds }, status: 'attend' },
          attributes: ['match_id'],
        }),
        BasketballMemberMatchRecord.findAll({
          where: { match_id: { [Op.in]: matchIds }, user_id: { [Op.in]: memUserIds } },
          attributes: ['match_id'],
        }),
      ]);
      const okIds = new Set([...attRows.map((r) => r.match_id), ...recRows.map((r) => r.match_id)]);
      matches = matches.filter((m) => okIds.has(m.id));
    }

    const matchIds = matches.map((m) => m.id);
    // 참석 집계 + 내 투표
    const atts = matchIds.length
      ? await BasketballMatchAttendance.findAll({
          where: { match_id: { [Op.in]: matchIds } },
          attributes: ['match_id', 'user_id', 'status'],
        })
      : [];
    const attByMatch = {};
    for (const a of atts) {
      const e = (attByMatch[a.match_id] = attByMatch[a.match_id] || { attend: 0, absent: 0, pending: 0, mine: null });
      if (ATT_STATUSES.includes(a.status)) e[a.status]++;
      if (a.user_id === userId) e.mine = a.status;
    }

    // 완료 경기 스쿼드 스코어
    const completedIds = matches.filter((m) => m.status === 'completed').map((m) => m.id);
    const squadScore = {};
    if (completedIds.length) {
      const [squads, recs] = await Promise.all([
        BasketballMatchSquad.findAll({ where: { match_id: { [Op.in]: completedIds } } }),
        BasketballMemberMatchRecord.findAll({
          where: { match_id: { [Op.in]: completedIds } },
          attributes: ['match_id', 'squad_id', 'pts'],
        }),
      ]);
      const ptsBySquad = {};
      for (const r of recs) {
        if (r.squad_id == null) continue;
        (ptsBySquad[r.match_id] = ptsBySquad[r.match_id] || {});
        ptsBySquad[r.match_id][r.squad_id] = (ptsBySquad[r.match_id][r.squad_id] || 0) + r.pts;
      }
      for (const s of squads) {
        (squadScore[s.match_id] = squadScore[s.match_id] || []).push({
          label: s.squad_label,
          points: ptsBySquad[s.match_id]?.[s.id] || 0,
        });
      }
    }

    const data = matches.map((m) => ({
      id: m.id,
      title: m.title,
      match_date: m.match_date,
      location: m.location,
      type: m.type,
      status: m.status,
      quarterCount: m.quarter_count,
      quarterMinutes: m.quarter_minutes,
      attendeeCount: attByMatch[m.id]?.attend || 0,
      myAttendance: attByMatch[m.id]?.mine || null,
      squads: squadScore[m.id] || [],
    }));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error('경기 목록 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`경기 목록 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 다음 경기 (현재 시각 기준 가장 가까운 예정/진행 경기) — 홈 투표 카드용
const getNextMatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { team_id } = req.query;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!team_id) throw new BadRequestError('팀 ID가 필요합니다.');
    await assertTeamMember(userId, team_id);

    const match = await BasketballMatch.findOne({
      where: {
        team_id: parseInt(team_id),
        status: { [Op.in]: ['scheduled', 'live'] },
        match_date: { [Op.gte]: new Date() },
      },
      order: [['match_date', 'ASC']],
    });
    if (!match) return res.status(200).json({ success: true, data: null });

    const atts = await BasketballMatchAttendance.findAll({ where: { match_id: match.id } });
    const memberMap = await buildMemberMap(match.team_id, atts.map((a) => a.user_id));
    const groups = { attend: [], absent: [], pending: [] };
    let mine = null;
    for (const a of atts) {
      const name = memberMap.get(a.user_id)?.name || `#${a.user_id}`;
      if (groups[a.status]) groups[a.status].push(name);
      if (a.user_id === userId) mine = a.status;
    }

    return res.status(200).json({
      success: true,
      data: {
        id: match.id,
        title: match.title,
        match_date: match.match_date,
        location: match.location,
        status: match.status,
        attend: groups.attend,
        absent: groups.absent,
        pending: groups.pending,
        mine,
      },
    });
  } catch (err) {
    logger.error('다음 경기 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`다음 경기 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 경기 상세 (참석현황 + 스쿼드 + 결과)
const getMatchDetail = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    const match = await BasketballMatch.findByPk(parseInt(matchId));
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    await assertTeamMember(userId, match.team_id);

    // 참석 현황
    const atts = await BasketballMatchAttendance.findAll({ where: { match_id: match.id } });
    const attMemberMap = await buildMemberMap(match.team_id, atts.map((a) => a.user_id));
    const attendance = {
      summary: { attend: 0, absent: 0, pending: 0 },
      list: atts.map((a) => ({
        user_id: a.user_id,
        status: a.status,
        ...(attMemberMap.get(a.user_id) || { name: `#${a.user_id}`, image_url: null }),
      })),
      mine: atts.find((a) => a.user_id === userId)?.status || null,
    };
    for (const a of atts) if (ATT_STATUSES.includes(a.status)) attendance.summary[a.status]++;

    // 스쿼드
    const squads = await BasketballMatchSquad.findAll({ where: { match_id: match.id } });
    const squadMembers = squads.length
      ? await BasketballMatchSquadMember.findAll({ where: { squad_id: { [Op.in]: squads.map((s) => s.id) } } })
      : [];
    const sqMemMap = {};
    for (const sm of squadMembers) (sqMemMap[sm.squad_id] = sqMemMap[sm.squad_id] || []).push(sm);
    const smUserMap = await buildMemberMap(
      match.team_id,
      squadMembers.filter((sm) => sm.user_id != null).map((sm) => sm.user_id)
    );
    const squadList = squads.map((s) => ({
      squadId: s.id,
      label: s.squad_label,
      members: (sqMemMap[s.id] || []).map((sm) =>
        sm.user_id != null
          ? smUserMap.get(sm.user_id) || { user_id: sm.user_id, name: `#${sm.user_id}`, image_url: null }
          : { user_id: null, name: sm.guest_name, image_url: null, isGuest: true }
      ),
    }));

    // 결과 — 게임별로 구성 (하루 내 여러 게임)
    const recs = await BasketballMemberMatchRecord.findAll({ where: { match_id: match.id } });
    const qrecs = await BasketballMemberQuarterRecord.findAll({
      where: { match_id: match.id },
      order: [['quarter', 'ASC']],
    });
    const recUserMap = await buildMemberMap(match.team_id, [
      ...recs.filter((r) => r.user_id != null).map((r) => r.user_id),
      ...qrecs.map((q) => q.recorded_by).filter((x) => x != null),
    ]);
    const sqLabelById = {};
    for (const s of squads) sqLabelById[s.id] = s.squad_label;

    // 게임 번호별로 레코드 그룹핑
    const gamesMap = {};
    for (const r of recs) {
      const g = r.game_no || 1;
      (gamesMap[g] = gamesMap[g] || { recs: [], qrecs: [] }).recs.push(r);
    }
    for (const q of qrecs) {
      const g = q.game_no || 1;
      (gamesMap[g] = gamesMap[g] || { recs: [], qrecs: [] }).qrecs.push(q);
    }
    const gameMatchups = match.game_matchups || null;
    const gameNos = [...new Set([...Object.keys(gamesMap).map(Number), ...Object.keys(gameMatchups || {}).map(Number)])].sort((a, b) => a - b);

    const games = gameNos.map((g) => {
      const gr = gamesMap[g]?.recs || [];
      const gq = gamesMap[g]?.qrecs || [];
      const squadScores = {};
      for (const r of gr) if (r.squad_id != null) squadScores[r.squad_id] = (squadScores[r.squad_id] || 0) + r.pts;
      // 선수별 총 출전 분(쿼터 합)
      const minByKey = {};
      for (const q of gq) {
        const key = q.user_id != null ? `u${q.user_id}` : `g${q.guest_name}`;
        minByKey[key] = (minByKey[key] || 0) + (q.minutes || 0);
      }
      // 이 게임의 스쿼드: 대진 우선, 없으면 기록에 등장한 스쿼드
      const pair = gameMatchups?.[g];
      const squadIds = Array.isArray(pair) && pair.length
        ? pair
        : [...new Set(gr.map((r) => r.squad_id).filter((x) => x != null))];
      // 기록 담당자 (이 게임의 스쿼드×쿼터)
      const recorders = {};
      for (const q of gq) {
        if (q.recorded_by == null || q.squad_id == null) continue;
        recorders[q.squad_id] = recorders[q.squad_id] || {};
        if (!recorders[q.squad_id][q.quarter]) {
          recorders[q.squad_id][q.quarter] = {
            userId: q.recorded_by,
            name: recUserMap.get(q.recorded_by)?.name || `#${q.recorded_by}`,
          };
        }
      }
      return {
        gameNo: g,
        squads: squadIds.map((sid) => ({
          squadId: sid,
          label: sqLabelById[sid] || `#${sid}`,
          points: squadScores[sid] || 0,
          isWin: !!gr.find((r) => r.squad_id === sid && r.is_win),
        })),
        players: gr.map((r) => ({
          key: r.user_id != null ? `u${r.user_id}` : `g${r.guest_name}`,
          user_id: r.user_id,
          name: r.user_id != null ? recUserMap.get(r.user_id)?.name || `#${r.user_id}` : r.guest_name || '게스트',
          image_url: r.user_id != null ? recUserMap.get(r.user_id)?.image_url || null : null,
          isGuest: r.user_id == null,
          squad_id: r.squad_id,
          squad_label: r.squad_id != null ? sqLabelById[r.squad_id] : null,
          minutes: minByKey[r.user_id != null ? `u${r.user_id}` : `g${r.guest_name}`] || 0,
          pts: r.pts, reb: r.reb, ast: r.ast, stl: r.stl, blk: r.blk, turnover: r.turnover, pf: r.pf,
          fg_pct: r.fg_pct, threep_pct: r.threep_pct, ft_pct: r.ft_pct, is_win: r.is_win,
        })),
        quarters: gq.reduce((acc, q) => {
          (acc[q.quarter] = acc[q.quarter] || []).push({
            key: q.user_id != null ? `u${q.user_id}` : `g${q.guest_name}`,
            user_id: q.user_id, squad_id: q.squad_id, minutes: q.minutes || 0,
            pts: q.pts, reb: q.reb, ast: q.ast, stl: q.stl, blk: q.blk, turnover: q.turnover, pf: q.pf,
          });
          return acc;
        }, {}),
        savedQuarters: [...new Set(gq.map((q) => q.quarter))].sort((a, b) => a - b),
        recorders,
        mode: 'headtohead',
      };
    }).filter((g) => g.players.length > 0 || g.savedQuarters.length > 0);

    return res.status(200).json({
      success: true,
      data: {
        id: match.id,
        title: match.title,
        match_date: match.match_date,
        location: match.location,
        type: match.type,
        status: match.status,
        quarterCount: match.quarter_count,
        quarterMinutes: match.quarter_minutes,
        attendance,
        squads: squadList,
        games, // 게임별 결과 배열
        result: games[0] || null, // 하위호환(단일 게임)
      },
    });
  } catch (err) {
    logger.error('경기 상세 조회 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`경기 상세 조회 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 참석 투표 (본인)
const updateAttendance = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    const { status } = req.body;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    if (!ATT_STATUSES.includes(status)) throw new BadRequestError('올바르지 않은 참석 상태입니다.');
    const match = await BasketballMatch.findByPk(parseInt(matchId));
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    await assertTeamMember(userId, match.team_id);

    const [row, created] = await BasketballMatchAttendance.findOrCreate({
      where: { match_id: match.id, user_id: userId },
      defaults: { status },
    });
    if (!created) await row.update({ status });
    return res.status(200).json({ success: true, data: { status } });
  } catch (err) {
    logger.error('참석 투표 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`참석 투표 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 수동 기록 입력 후 경기 완료 처리
const completeMatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    const match = await BasketballMatch.findByPk(parseInt(matchId));
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    await assertTeamMember(userId, match.team_id);
    const cnt = await BasketballMemberMatchRecord.count({ where: { match_id: match.id } });
    await match.update({ status: 'completed', total_players: cnt });
    return res.status(200).json({ success: true, data: { matchId: match.id } });
  } catch (err) {
    logger.error('경기 완료 처리 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`경기 완료 처리 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 경기 수정 (팀장/운영진, 종료 전)
const updateMatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    const { title, match_date, location, quarter_count } = req.body;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    const match = await BasketballMatch.findByPk(parseInt(matchId));
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    await assertTeamManager(userId, match.team_id, req.user?.role);
    if (match.status === 'completed') throw new BadRequestError('종료된 경기는 수정할 수 없습니다.');

    const fields = {};
    if (title != null && title.trim()) fields.title = title.trim();
    if (match_date != null) fields.match_date = new Date(match_date);
    if (location != null) fields.location = location;
    // 쿼터 수는 예정 상태에서만 변경 가능(진행 중 드래프트 구조 보호)
    if (quarter_count != null && match.status === 'scheduled') {
      fields.quarter_count = Math.min(Math.max(toInt(quarter_count) || 4, 1), 12);
    }
    await match.update(fields);
    return res.status(200).json({ success: true, data: match.dataValues });
  } catch (err) {
    logger.error('경기 수정 에러:', err);
    if (
      err instanceof BadRequestError ||
      err instanceof UnauthorizedError ||
      err instanceof ForbiddenError
    ) {
      throw err;
    }
    throw new BadGatewayError(`경기 수정 중 오류가 발생했습니다: ${err.message}`);
  }
};

// 경기 삭제/취소 (종료 전)
const deleteMatch = async (req, res) => {
  const t = await sequelize.transaction();
  let committed = false;
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');
    const match = await BasketballMatch.findByPk(parseInt(matchId), { transaction: t });
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    await assertTeamManager(userId, match.team_id, req.user?.role);
    if (match.status === 'completed') throw new BadRequestError('종료된 경기는 삭제할 수 없습니다.');

    const squads = await BasketballMatchSquad.findAll({ where: { match_id: match.id }, transaction: t });
    if (squads.length) {
      await BasketballMatchSquadMember.destroy({
        where: { squad_id: { [Op.in]: squads.map((s) => s.id) } },
        transaction: t,
      });
    }
    await BasketballMatchSquad.destroy({ where: { match_id: match.id }, transaction: t });
    await BasketballMatchAttendance.destroy({ where: { match_id: match.id }, transaction: t });
    await match.destroy({ transaction: t }); // soft delete

    await t.commit();
    committed = true;
    await cleanupLive(matchId, match.team_id);
    return res.status(200).json({ success: true });
  } catch (err) {
    if (!committed) await t.rollback();
    logger.error('경기 삭제 에러:', err);
    if (
      err instanceof BadRequestError ||
      err instanceof UnauthorizedError ||
      err instanceof ForbiddenError
    ) {
      throw err;
    }
    throw new BadGatewayError(`경기 삭제 중 오류가 발생했습니다: ${err.message}`);
  }
};

// ───────────────────────────────────────────────
// 팀 추천 (자동 밸런싱): 실력(랭킹 종합점수) + 포지션 분산 + 최근 2주 같은 팀 회피
// ───────────────────────────────────────────────
const SUGGEST_W_SKILL = 1.0; // 팀 실력합 표준편차 가중(주요)
const SUGGEST_W_RECENT = 2.0; // 최근 2주 같은 팀 재구성 페널티(쌍당)
const SUGGEST_W_POS = 0.5; // 포지션 편중 페널티

const suggestTeams = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    const count = Math.min(Math.max(parseInt(req.query.count) || 2, 2), 4);
    if (!userId) throw new BadRequestError('사용자 정보가 없습니다.');

    const match = await BasketballMatch.findByPk(parseInt(matchId));
    if (!match) throw new BadRequestError('경기를 찾을 수 없습니다.');
    const teamId = match.team_id;
    await assertTeamMember(userId, teamId);

    // 참석자(attend) → 없으면 전체 투표자
    const atts = await BasketballMatchAttendance.findAll({ where: { match_id: match.id } });
    let attendeeIds = [...new Set(atts.filter((a) => a.status === 'attend').map((a) => a.user_id))];
    if (attendeeIds.length === 0) attendeeIds = [...new Set(atts.map((a) => a.user_id))];
    if (attendeeIds.length === 0) return res.status(200).json({ success: true, data: { squads: [] } });

    // 멤버 정보(이름/이미지/포지션)
    const members = await BasketballTeamMember.findAll({
      where: { team_id: teamId, user_id: { [Op.in]: attendeeIds }, is_active: 1 },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    });
    const info = new Map();
    for (const m of members) {
      info.set(m.user_id, {
        userId: m.user_id,
        name: m.user?.name || `선수${m.user_id}`,
        image: m.image_url || null,
        position: m.position || null,
      });
    }
    for (const uid of attendeeIds)
      if (!info.has(uid)) info.set(uid, { userId: uid, name: `선수${uid}`, image: null, position: null });

    // 실력: 랭킹 종합점수(PIE 70 + 승률 30) — 전체 누적 기준
    const gpwRows = await BasketballMemberMatchRecord.findAll({
      where: { team_id: teamId, user_id: { [Op.in]: attendeeIds } },
      attributes: ['user_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'gp'], [Sequelize.fn('SUM', Sequelize.col('is_win')), 'w']],
      group: ['user_id'],
      raw: true,
    });
    const gpw = new Map();
    for (const r of gpwRows) gpw.set(Number(r.user_id), { gp: parseInt(r.gp) || 0, w: parseInt(r.w) || 0 });

    // PIE: 팀 전체 기록으로 경기별 기여 총합(분모) 계산 후 개인 몫
    const pieRecs = await BasketballMemberMatchRecord.findAll({
      where: { team_id: teamId },
      attributes: ['user_id', 'match_id', 'pts', 'fgm', 'fga', 'ftm', 'fta', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'pf', 'turnover'],
      raw: true,
    });
    const contrib = (r) =>
      toInt(r.pts) + toInt(r.fgm) + toInt(r.ftm) - toInt(r.fga) - toInt(r.fta) +
      toInt(r.dreb) + 0.5 * toInt(r.oreb) + toInt(r.ast) + toInt(r.stl) + 0.5 * toInt(r.blk) -
      toInt(r.pf) - toInt(r.turnover);
    const gameTotal = {};
    const pc = {};
    for (const r of pieRecs) {
      const c = contrib(r);
      gameTotal[r.match_id] = (gameTotal[r.match_id] || 0) + c;
      if (r.user_id == null) continue;
      const p = (pc[r.user_id] = pc[r.user_id] || { num: 0, matches: [] });
      p.num += c;
      p.matches.push(r.match_id);
    }
    const pieMap = new Map();
    for (const [uid, v] of Object.entries(pc)) {
      const den = v.matches.reduce((s, m) => s + (gameTotal[m] || 0), 0);
      pieMap.set(Number(uid), den > 0 ? (v.num / den) * 100 : 0);
    }

    // 자격자(경기 있음) 내에서 pie·승률 정규화 → 종합점수(0~100). 무경기는 중앙값 대체
    const norm = (x, arr) => {
      const mn = Math.min(...arr);
      const mx = Math.max(...arr);
      return mx > mn ? ((x - mn) / (mx - mn)) * 100 : 50;
    };
    const withGames = attendeeIds.filter((uid) => (gpw.get(uid)?.gp || 0) > 0);
    const skillMap = new Map();
    if (withGames.length) {
      const pies = withGames.map((uid) => pieMap.get(uid) || 0);
      const wins = withGames.map((uid) => {
        const g = gpw.get(uid);
        return g.gp > 0 ? (g.w / g.gp) * 100 : 0;
      });
      for (const uid of withGames) {
        const g = gpw.get(uid);
        const winRate = g.gp > 0 ? (g.w / g.gp) * 100 : 0;
        skillMap.set(uid, 0.7 * norm(pieMap.get(uid) || 0, pies) + 0.3 * norm(winRate, wins));
      }
    }
    const skillVals = [...skillMap.values()];
    const median = skillVals.length
      ? skillVals.sort((a, b) => a - b)[Math.floor(skillVals.length / 2)]
      : 50;
    for (const uid of attendeeIds) if (!skillMap.has(uid)) skillMap.set(uid, median); // 무경기 = 중립

    // 최근 2주 같은 팀(스쿼드) 쌍
    const since = new Date(Date.now() - 14 * 86400000);
    const recentRows = await BasketballMemberMatchRecord.findAll({
      where: { team_id: teamId, squad_id: { [Op.ne]: null }, user_id: { [Op.ne]: null }, created_at: { [Op.gte]: since } },
      attributes: ['match_id', 'squad_id', 'user_id'],
      raw: true,
    });
    const grp = {};
    for (const r of recentRows) {
      const k = `${r.match_id}_${r.squad_id}`;
      (grp[k] = grp[k] || []).push(r.user_id);
    }
    const recentPair = new Set();
    for (const arr of Object.values(grp)) {
      const us = [...new Set(arr)];
      for (let i = 0; i < us.length; i++)
        for (let j = i + 1; j < us.length; j++)
          recentPair.add(us[i] < us[j] ? `${us[i]}-${us[j]}` : `${us[j]}-${us[i]}`);
    }

    // ── 밸런싱: 스네이크 드래프트 + 로컬 서치(스왑) + 랜덤 재시작 ──
    const players = attendeeIds.map((uid) => ({ ...info.get(uid), skill: skillMap.get(uid) }));
    const POSITIONS = ['guard', 'forward', 'center'];
    const teamSkill = (t) => t.reduce((s, p) => s + p.skill, 0);
    const objective = (tt) => {
      const sums = tt.map(teamSkill);
      const mean = sums.reduce((a, b) => a + b, 0) / tt.length;
      const skillStd = Math.sqrt(sums.reduce((a, s) => a + (s - mean) ** 2, 0) / tt.length);
      let rec = 0;
      for (const t of tt)
        for (let i = 0; i < t.length; i++)
          for (let j = i + 1; j < t.length; j++) {
            const a = t[i].userId, b = t[j].userId;
            if (recentPair.has(a < b ? `${a}-${b}` : `${b}-${a}`)) rec++;
          }
      let pos = 0;
      for (const P of POSITIONS) {
        const counts = tt.map((t) => t.filter((p) => p.position === P).length);
        pos += Math.max(...counts) - Math.min(...counts);
      }
      return SUGGEST_W_SKILL * skillStd + SUGGEST_W_RECENT * rec + SUGGEST_W_POS * pos;
    };
    const snake = (arr) => {
      const teams = Array.from({ length: count }, () => []);
      let idx = 0, dir = 1;
      for (const p of arr) {
        teams[idx].push(p);
        idx += dir;
        if (idx >= count) { idx = count - 1; dir = -1; } else if (idx < 0) { idx = 0; dir = 1; }
      }
      return teams;
    };
    const localSearch = (teams) => {
      let improved = true;
      let best = objective(teams);
      while (improved) {
        improved = false;
        for (let a = 0; a < count; a++)
          for (let b = a + 1; b < count; b++)
            for (let i = 0; i < teams[a].length; i++)
              for (let j = 0; j < teams[b].length; j++) {
                [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
                const o = objective(teams);
                if (o < best - 1e-9) { best = o; improved = true; }
                else [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]]; // 되돌림
              }
      }
      return { teams, score: best };
    };
    let bestResult = null;
    for (let restart = 0; restart < 12; restart++) {
      // 실력 내림차순 + 랜덤 타이브레이크(재시작마다 다양성)
      const shuffled = [...players]
        .map((p) => ({ p, k: p.skill + (Math.random() - 0.5) * 1e-3 }))
        .sort((x, y) => y.k - x.k)
        .map((x) => x.p);
      const { teams, score } = localSearch(snake(shuffled));
      if (!bestResult || score < bestResult.score) bestResult = { teams, score };
    }

    const labels = ['A', 'B', 'C', 'D'];
    const squads = bestResult.teams.map((t, i) => ({
      label: labels[i] || `${i + 1}`,
      members: t.map((p) => ({ userId: p.userId, name: p.name, image: p.image, position: p.position })),
    }));

    return res.status(200).json({ success: true, data: { squads } });
  } catch (err) {
    logger.error('팀 추천 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) throw err;
    throw new BadGatewayError(`팀 추천 중 오류가 발생했습니다: ${err.message}`);
  }
};

module.exports = {
  createTeam,
  getTeamInfo,
  setDefaultTeam,
  getMembers,
  getMember,
  getRankingsYears,
  getRankings,
  getDuoRankings,
  getRecordsYears,
  getRecords,
  getTeamManagement,
  getDuesHistory,
  updateDuePayment,
  createMonthlyDues,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  createMatch,
  createMatchRecord,
  getMatches,
  getNextMatch,
  getMatchDetail,
  suggestTeams,
  updateAttendance,
  completeMatch,
  updateMatch,
  deleteMatch,
  startLiveOnMatch,
  getActiveLiveMatches,
  getLiveMatch,
  saveLiveSquad,
  updateLiveQuarterMinutes,
  setQuarterMatchup,
  addLiveGame,
  setLiveGameMatchup,
  saveLiveQuarter,
  finishLiveMatch,
  reopenLiveMatch,
  discardLiveMatch,
};
