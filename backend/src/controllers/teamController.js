const { BadGatewayError } = require('../errors/index.js');
const { User } = require('../models/index.js');

// 전체 회원 조회
const getMembers = async (req, res) => {
  try {
    const where = {};
    // 검색조건
    const members = await User.findAll({ where });
    // 조회
    return res.status(200).json({ success: true, data: members });
  } catch (err) {
    throw new BadGatewayError();
  }
};

// ! 개발 진행 중
// 회원 조회
const getMember = async (req, res) => {
  try {
    const where = { id: req.query.memberId };

    // 검색조건
    const members = User.findAll({ where });
    // 조회
    return res.status(200).json({ success: true, data: members });
  } catch (err) {
    throw new BadGatewayError();
  }
};

module.exports = {
  getMembers,
  getMember,
};
