const express = require('express');
const router = express.Router();
const memberRecruitmentController = require('../controllers/memberRecruitmentController');
const authMiddleware = require('../middleware/authMiddleware');

// 글쓰기 가능한 팀 목록 조회 (인증 필요) - :id보다 먼저 와야 함
router.get('/my-teams/list', authMiddleware, memberRecruitmentController.getMyTeamsForRecruitment);

// 목록 조회 (인증 불필요)
router.get('/', memberRecruitmentController.getMemberRecruitments);

// 상세 조회 (인증 불필요)
router.get('/:id', memberRecruitmentController.getMemberRecruitmentById);

// 작성 (인증 필요)
router.post('/', authMiddleware, memberRecruitmentController.createMemberRecruitment);

// 수정 (인증 필요)
router.put('/:id', authMiddleware, memberRecruitmentController.updateMemberRecruitment);

// 삭제 (인증 필요)
router.delete('/:id', authMiddleware, memberRecruitmentController.deleteMemberRecruitment);

// 가입 신청 (인증 필요)
router.post('/:id/apply', authMiddleware, memberRecruitmentController.applyToTeam);

// 가입 신청 취소 (인증 필요)
router.delete('/:id/cancel', authMiddleware, memberRecruitmentController.cancelTeamApplication);

module.exports = router;
