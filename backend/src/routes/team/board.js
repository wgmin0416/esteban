const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const boardController = require('../../controllers/boardController');

// 게시판 목록 조회
router.get('/', authMiddleware, boardController.getBoards);

// 게시글 상세 조회
router.get('/:id', authMiddleware, boardController.getBoard);

// 게시글 작성
router.post('/', authMiddleware, boardController.createBoard);

// 게시글 수정
router.put('/:id', authMiddleware, boardController.updateBoard);

// 게시글 삭제
router.delete('/:id', authMiddleware, boardController.deleteBoard);

module.exports = router;
