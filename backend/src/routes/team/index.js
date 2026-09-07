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
// == 경기(매치) ==
// 경기 목록 (연/월/멤버/상태 필터)
router.get('/matches', authMiddleware, teamController.getMatches);
// 경기 생성 (참석투표 자동 생성)
router.post('/match', authMiddleware, teamController.createMatch);
// 다음 경기 (홈 투표 카드)
router.get('/match/next', authMiddleware, teamController.getNextMatch);
// 경기 상세 (참석현황 + 스쿼드 + 결과)
router.get('/match/:matchId', authMiddleware, teamController.getMatchDetail);
// 경기 수정 (팀장/운영진)
router.put('/match/:matchId', authMiddleware, teamController.updateMatch);
// 경기 삭제/취소
router.delete('/match/:matchId', authMiddleware, teamController.deleteMatch);
// 참석 투표
router.put('/match/:matchId/attendance', authMiddleware, teamController.updateAttendance);
// 수동 기록 입력 후 경기 완료 처리
router.post('/match/:matchId/complete', authMiddleware, teamController.completeMatch);
// 경기 기록 저장 (수동 입력)
router.post('/match-record', authMiddleware, teamController.createMatchRecord);

// == 라이브 경기 기록 ==
// 진행 중 경기 목록
router.get('/live/active', authMiddleware, teamController.getActiveLiveMatches);
// 라이브 기록 시작 (기존 경기에 스쿼드 구성 + 드래프트 생성)
router.post('/live/:matchId/start', authMiddleware, teamController.startLiveOnMatch);
// 라이브 경기 드래프트 조회 (재진입/합류)
router.get('/live/:matchId', authMiddleware, teamController.getLiveMatch);
// 스쿼드 스탯 자동저장
router.put('/live/:matchId/squad/:squadId', authMiddleware, teamController.saveLiveSquad);
// 쿼터별 시간(분) 갱신
router.put('/live/:matchId/quarter-minutes', authMiddleware, teamController.updateLiveQuarterMinutes);
// 쿼터별 누적 저장 → 해당 쿼터 record 확정 (전 쿼터 저장 시 자동 종료)
router.post('/live/:matchId/quarter/:quarter/save', authMiddleware, teamController.saveLiveQuarter);
// 경기 종료 → DB 저장
router.post('/live/:matchId/finish', authMiddleware, teamController.finishLiveMatch);
// 종료된 경기 기록 수정 → DB 기록을 드래프트로 복원 후 다시 live 전환
router.post('/live/:matchId/reopen', authMiddleware, teamController.reopenLiveMatch);
// 라이브 드래프트 폐기
router.delete('/live/:matchId', authMiddleware, teamController.discardLiveMatch);

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
