const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/teamController.js');
const authMiddleware = require('../../middleware/authMiddleware.js');

// == 팀 관련 ==
// 팀 생성
router.post('/create-team', authMiddleware, teamController.createTeam);
// 팀 정보 조회
router.get('/info', authMiddleware, teamController.getTeamInfo);
// 기본 팀 설정
router.post('/set-default', authMiddleware, teamController.setDefaultTeam);
// 전체 회원 조회
router.get('/members', authMiddleware, teamController.getMembers);
// 회원 조회
router.get('/member', authMiddleware, teamController.getMember);

module.exports = router;
