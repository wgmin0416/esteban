const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const boardController = require('../../controllers/boardController');

// 게시판 목록 조회
router.get('/', authMiddleware, boardController.getBoards);

// 홈 노출 공지 조회 (:id 보다 먼저 매칭돼야 함)
router.get('/home-notice', authMiddleware, boardController.getHomeNotice);

// 게시글 상세 조회
router.get('/:id', authMiddleware, boardController.getBoard);

// 게시글 작성
router.post('/', authMiddleware, boardController.createBoard);

// 게시글 수정
router.put('/:id', authMiddleware, boardController.updateBoard);

// 게시글 삭제
router.delete('/:id', authMiddleware, boardController.deleteBoard);

// 댓글
router.post('/:id/comments', authMiddleware, boardController.addComment);
router.delete('/:id/comments/:commentId', authMiddleware, boardController.deleteComment);

// 반응(좋아요/이모지)
router.post('/:id/reactions', authMiddleware, boardController.toggleReaction);

// 게시글 투표
router.post('/:id/poll/vote', authMiddleware, boardController.votePoll);

// 홈 노출 공지 설정/해제 (관리자)
router.post('/:id/pin-home', authMiddleware, boardController.toggleHomeNotice);

module.exports = router;
