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
// 랭킹 사용 가능한 연도 목록 조회
router.get('/rankings/years', authMiddleware, teamController.getRankingsYears);
// 랭킹 조회
router.get('/rankings', authMiddleware, teamController.getRankings);
// 듀오 랭킹 조회
router.get('/rankings/duos', authMiddleware, teamController.getDuoRankings);
// 기록 사용 가능한 연도 목록 조회
router.get('/records/years', authMiddleware, teamController.getRecordsYears);
// 기록 조회
router.get('/records', authMiddleware, teamController.getRecords);

module.exports = router;
