const express = require('express');
const router = express.Router();
const courtBoardController = require('../controllers/courtBoardController');
const authMiddleware = require('../middleware/authMiddleware');

// 목록 조회 (인증 불필요)
router.get('/', courtBoardController.getCourtBoards);

// 상세 조회 (인증 불필요)
router.get('/:id', courtBoardController.getCourtBoardById);

// 작성 (인증 필요)
router.post('/', authMiddleware, courtBoardController.createCourtBoard);

// 수정 (인증 필요)
router.put('/:id', authMiddleware, courtBoardController.updateCourtBoard);

// 삭제 (인증 필요)
router.delete('/:id', authMiddleware, courtBoardController.deleteCourtBoard);

module.exports = router;
