const { BadGatewayError, BadRequestError, ForbiddenError } = require('../errors/index.js');
const { User, Team, BasketballTeamMember, JoinRequest } = require('../models/index.js');

// 팀 생성
const createTeam = async (req, res) => {
  try {
    const { name, leader_id, sports, intro, logo_url, region, established_at, is_public } =
      req.body;
    if (!leader_id) {
      throw new BadRequestError('리더 아이디가 존재하지 않습니다.');
    }
    if (!name) {
      throw new BadRequestError('팀명이 존재하지 않습니다.');
    }
    if (!sports) {
      throw new BadRequestError('종목이 존재하지 않습니다.');
    }
    if (!region) {
      throw new BadRequestError('주 활동 지역이 존재하지 않습니다.');
    }

    // 팀 생성
    await Team.create({
      name,
      leader_id,
      sports,
      intro,
      logo_url,
      region,
      established_at,
      is_public,
    });

    return res.status(201).json({ success: true });
  } catch (err) {
    throw new BadGatewayError('팀 생성 중 오류가 발생했습니다.');
  }
};

// 전체 회원 조회
const getMembers = async (req, res) => {
  try {
    // 검색조건
    const where = {};

    // 조회
    const members = await User.findAll({
      attributes: ['name', 'phone', 'gender'],
      include: [
        {
          model: BasketballTeamMember,
          as: 'team_members',
          raw: true,
          attributes: [
            'image_url',
            'intro',
            'role',
            'position',
            'uniform_number',
            'activity_score',
            'last_attended_at',
            'is_active',
          ],
        },
      ],
      where,
    });
    return res.status(200).json({ success: true, data: members });
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 회원 조회
const getMember = async (req, res) => {
  try {
    // 검색조건
    const where = { id: req.query.memberId };
    if (!req.query.memberId) {
      throw new BadRequestError('회원 번호를 입력해주세요.');
    }
    // 조회
    const member = User.findOne({ where });
    if (member) {
      return res.status(200).json({ success: true, data: members });
    } else {
      throw new BadRequestError('존재하지 않는 회원입니다.');
    }
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 팀 가입 신청
const requestMember = async (req, res) => {
  try {
    const userId = req.body.userId;
    const teamId = req.body.teamId;

    // 팀 조회
    const team = await Team.findOne({
      where: {
        team_id: teamId,
      },
    });

    if (!team) {
      throw new BadRequestError('존재하지 않는 팀입니다.');
    }

    await JoinRequest.create({
      user_id: userId,
      team_id: teamId,
    });

    res.status(200).json({
      success: true,
      message: '가입 신청되었습니다.',
    });
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 가입 신청 조회
const getJoinRequests = async (req, res) => {
  try {
    const teamId = req.query.teamId;
    const role = req.query.role;

    if (role !== 'leader') {
      throw new ForbiddenError();
    }

    const data = await JoinRequest.findAll({
      where: {
        team_id: teamId,
      },
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    throw new BadGatewayError();
  }
};

// 팀 가입 승인
const createMember = async (req, res) => {
  try {
    const role = req.params.role;
    if (role !== 'leader') {
      throw new ForbiddenError();
    }
  } catch (err) {
    throw new BadGatewayError();
  }
};

module.exports = {
  createTeam,
  getMembers,
  getMember,
  requestMember,
  getJoinRequests,
  createMember,
};
