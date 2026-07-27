const express = require('express');
const router = express.Router();
const matchBoardController = require('../controllers/matchBoardController');
const authMiddleware = require('../middleware/authMiddleware');

// 목록 조회 (인증 불필요)
router.get('/', matchBoardController.getMatchBoards);

// 상세 조회 (인증 불필요)
router.get('/:id', matchBoardController.getMatchBoardById);

// 작성 (인증 필요)
router.post('/', authMiddleware, matchBoardController.createMatchBoard);

// 수정 (인증 필요)
router.put('/:id', authMiddleware, matchBoardController.updateMatchBoard);

// 삭제 (인증 필요)
router.delete('/:id', authMiddleware, matchBoardController.deleteMatchBoard);

// 신청 (인증 필요)
router.post('/:id/apply', authMiddleware, matchBoardController.applyToMatch);

// 신청 취소 (인증 필요)
router.delete('/:id/cancel', authMiddleware, matchBoardController.cancelApplication);

module.exports = router;
