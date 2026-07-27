const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/teamController.js');
const authMiddleware = require('../../middleware/authMiddleware.js');
const boardRouter = require('./board.js');

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
// 경기 생성
router.post('/match', authMiddleware, teamController.createMatch);
// 경기 기록 저장
router.post('/match-record', authMiddleware, teamController.createMatchRecord);

// == 팀 관리 관련 ==
// 팀 관리 - 회원 명부 및 회비 조회
router.get('/management', authMiddleware, teamController.getTeamManagement);
// 회비 납부 처리
router.put('/dues/payment', authMiddleware, teamController.updateDuePayment);
// 회비 전체 내역 조회
router.get('/dues/history', authMiddleware, teamController.getDuesHistory);
// 월별 회비 생성
router.post('/dues/create-monthly', authMiddleware, teamController.createMonthlyDues);
// 가입 신청 목록 조회
router.get('/join-requests', authMiddleware, teamController.getJoinRequests);
// 가입 신청 승인
router.put('/join-requests/:id/approve', authMiddleware, teamController.approveJoinRequest);
// 가입 신청 거절
router.put('/join-requests/:id/reject', authMiddleware, teamController.rejectJoinRequest);

// == 게시판 관련 ==
router.use('/boards', boardRouter);

module.exports = router;
