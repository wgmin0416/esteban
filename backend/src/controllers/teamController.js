const {
  BadGatewayError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} = require('../errors/index.js');
const {
  User,
  Team,
  BasketballTeamMember,
  JoinRequest,
  BasketballMemberPeriodRecord,
  BasketballMemberMatchRecord,
  BasketballMatchSquad,
  BasketballMatch,
  TeamDue,
} = require('../models/index.js');
const { Op, Sequelize } = require('sequelize');
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
 *                 format: date-time
 *                 example: "2025-11-27T17:00:00Z"
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
      established_at: established_at && established_at.trim() !== '' ? established_at : null,
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

    const records = await BasketballMemberPeriodRecord.findAll({
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

    const defaultYears = [2024, 2025, 2026];
    const uniqueYears = [...new Set([...years, ...defaultYears])].sort((a, b) => b - a);

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

      return {
        no: index + 1,
        userId: user?.id || row.user_id,
        userName: user?.name || `선수${row.user_id}`,
        userImage: teamMember?.image_url || null,
        gp: gp,
        w: w,
        l: l,
        pts: parseFloat(row.pts || 0).toFixed(1),
        fgPct: parseFloat(row.fg_pct || 0).toFixed(1),
        twopPct: twopPct.toFixed(1),
        threepPct: threepPct.toFixed(1),
        ftPct: ftPct.toFixed(1),
        reb: parseFloat(row.reb || 0).toFixed(1),
        ast: parseFloat(row.ast || 0).toFixed(1),
        stl: parseFloat(row.stl || 0).toFixed(1),
        blk: parseFloat(row.blk || 0).toFixed(1),
        turnover: parseFloat(row.turnover || 0).toFixed(1),
        pf: parseFloat(row.pf || 0).toFixed(1),
        dd2: parseInt(row.dd2 || 0),
        td3: parseInt(row.td3 || 0),
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

    // 같은 match_id와 squad_id를 가진 선수들의 듀오 데이터 조회
    const duoData = await BasketballMemberMatchRecord.findAll({
      where: {
        team_id: teamId,
        squad_id: { [Op.ne]: null },
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        'match_id',
        'squad_id',
        [
          Sequelize.fn('GROUP_CONCAT', Sequelize.fn('DISTINCT', Sequelize.col('user_id'))),
          'user_ids',
        ],
        [Sequelize.fn('MAX', Sequelize.col('is_win')), 'is_win'], // 같은 match_id, squad_id면 승패는 동일
      ],
      group: ['match_id', 'squad_id'],
      having: Sequelize.literal('COUNT(DISTINCT user_id) = 2'), // 정확히 2명인 듀오만
      raw: true,
    });

    // 듀오별로 집계 (같은 두 선수의 조합)
    const duoMap = {};

    for (const record of duoData) {
      const userIds = record.user_ids
        ? record.user_ids
            .split(',')
            .map((id) => parseInt(id.trim()))
            .sort((a, b) => a - b)
        : [];
      if (userIds.length !== 2) continue;

      const duoKey = `${userIds[0]}-${userIds[1]}`;

      if (!duoMap[duoKey]) {
        duoMap[duoKey] = {
          user1Id: userIds[0],
          user2Id: userIds[1],
          wins: 0,
          games: 0,
        };
      }

      duoMap[duoKey].wins += parseInt(record.is_win || 0);
      duoMap[duoKey].games += 1;
    }

    // 승률 계산 및 정렬
    const duos = Object.values(duoMap)
      .map((duo) => ({
        ...duo,
        winRate: duo.games > 0 ? (duo.wins / duo.games) * 100 : 0,
      }))
      .filter((duo) => duo.games >= 5) // 최소 5경기 이상
      .sort((a, b) => {
        if (type === 'best') {
          return b.winRate - a.winRate; // 승률 높은 순
        } else {
          return a.winRate - b.winRate; // 승률 낮은 순
        }
      })
      .slice(0, 10); // 상위 10개

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
        winRate: duo.winRate.toFixed(1),
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
  try {
    const userId = req.user?.id;
    const { team_id, title, match_date, location, type, total_players } = req.body;

    if (!userId) {
      throw new BadRequestError('사용자 정보가 없습니다.');
    }

    if (!team_id || !title || !match_date || !type) {
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

    // 경기 생성
    const match = await BasketballMatch.create({
      team_id: parseInt(team_id),
      title,
      match_date: new Date(match_date),
      location: location || '',
      type,
      total_players: total_players || 0,
    });

    return res.status(200).json({ success: true, data: match.dataValues });
  } catch (err) {
    logger.error('경기 생성 에러:', err);
    if (err instanceof BadRequestError || err instanceof UnauthorizedError) {
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
};
